# Knowledge Graph Mode

> 除代码外，Understand Anything 还支持 markdown wiki 作为输入，构建可问答的知识图谱。

## 触发

```bash
# 项目含 wiki/ 或 index.md
$ /understand-knowledge
# 自动检测：
# - wiki/ 目录 → 解析所有 .md
# - 单 index.md → 解析
# - 任何含 wikilink [[...]] 的 markdown
```

## 数据模型差异

```ts
type NodeType = ... | "article" | "entity" | "claim" | "topic" | "category"

interface ArticleNode extends GraphNode {
  type: "article"
  knowledgeMeta: {
    content: string           // markdown body
    frontmatter: Record<string, unknown>
    wikilinks: string[]       // [[target]] 解析
    headings: Heading[]       // H1-H6
  }
}

interface EntityNode extends GraphNode {
  type: "entity"
  knowledgeMeta: {
    type: "person" | "concept" | "tool" | "place" | "event"
    aliases: string[]
  }
}

interface ClaimNode extends GraphNode {
  type: "claim"
  knowledgeMeta: {
    statement: string        // 断言内容
    confidence: "verified" | "inferred" | "speculative"
    evidence: string[]       // 引用 article IDs
  }
}

interface TopicNode extends GraphNode {
  type: "topic"
  knowledgeMeta: {
    description: string
    articleIds: string[]     // 属于该 topic 的 articles
  }
}

interface CategoryNode extends GraphNode {
  type: "category"
  knowledgeMeta: {
    description: string
    topicIds: string[]
  }
}
```

## 边类型

```ts
type KnowledgeEdgeType =
  | "references"      // article → article
  | "mentions"        // article → entity
  | "supports"        // article → claim (or vice versa)
  | "contradicts"     // article → claim
  | "categorized-under"  // article → topic
  | "subcategory-of"  // topic → topic
  | "related"         // generic
```

## Pipeline

```
1. parse-knowledge-base.py
   - 扫 wiki/ or index.md
   - 解析每个 .md:
     * frontmatter (YAML)
     * content
     * wikilinks [[target]] or [[target|alias]]
     * headings (H1-H6)
   - 输出:
     * scan-manifest.json (含 categories, articles)
     * intermediate/knowledge-batches/

2. article-analyzer agent ×N (parallel per article)
   - LLM 读 article content
   - 提取:
     * entities (人/概念/工具/...)
     * claims (断言/事实)
     * relationships (refers to, supports, contradicts)
   - 输出: intermediate/analysis-batch-N.json

3. domain-analyzer agent
   - 跨 article 找主题
   - 划 category
   - 输出: categories + topics + 关联

4. merge-knowledge-graph.py
   - entity dedup (normalize name)
   - claim-article 关联 (parse statement 提到 article ID)
   - orphan fallback: ID prefix 匹配 / content substring 匹配
   - 构建 layer (per category)
   - 生成 tour (按 index.md category 顺序)
   - 输出: intermediate/assembled-graph.json → knowledge-graph.json
```

## Entity Deduplication

```python
# merge-knowledge-graph.py
def normalize_entity_name(name: str) -> str:
    return re.sub(r'[^a-z0-9]', '', name.lower())

# Example:
#   "Cache Invalidation" → "cacheinvalidation"
#   "cache invalidation" → "cacheinvalidation"  (same canonical)
#   "cache-invalidation" → "cacheinvalidation"  (same)
```

dedup 触发时，记录 `dedup_remap[duplicate_id] = canonical_id`，所有 edges 自动 remap。

## Orphan Resolution

如果 entity/claim 没直接 article 边，尝试：
1. **ID prefix match**: `entity:brain` → 找 `article:concepts/segment-brain`（`bare in stem`）
2. **Suffix match**: `bare.endswith(f"-{stem}")` → match
3. **Content match**: entity name 出现在 article content

3 步都失败才真正 orphan，graph-reviewer 警告。

## Tour 生成

```python
# 按 categories 顺序（来自 index.md H1 order）
for i, cat in enumerate(categories):
    topic_id = f"topic:{cat.slug}"
    members = [
        e.source for e in final_edges
        if e.type == "categorized_under" and e.target == topic_id
    ][:3]  # 最多 3 个 representative
    tour.append({
        "order": i + 1,
        "title": cat.name,
        "description": f"Explore the {cat.name} section ({cat.count} articles)",
        "nodeIds": members,
    })
```

## Dashboard 适配

- 检测 `graph.kind === "knowledge"`
- 节点配色按 article/entity/claim 区分
- 侧栏显示 article 完整 markdown content
- `/understand-chat` 优先召回 articles + claims

## 实际案例

Understand Anything 自己的 [knowledge-graph-guide agent](https://github.com/YeLuo45/Understand-Anything/blob/main/understand-anything-plugin/agents/knowledge-graph-guide.md) 就是用这个模式构建的文档知识图谱。

## 已知限制

- 不解析图片/视频内容
- wikilink 只支持 `[[target]]` 和 `[[target|alias]]`，不支持 embed `![[image]]`
- claim 提取依赖 LLM 质量，可能漏掉隐含断言
- 中文 wikilink 用 `[[概念]]` 时需要 LLM 识别为同义词
