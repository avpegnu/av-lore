import { z } from 'zod';
import { mockConfigSchema } from './mock-interview-models';
export const localizedText = z.object({ vi: z.string().min(1), en: z.string().min(1) });
export type LocalizedText = z.infer<typeof localizedText>;
const learningIcon = z.enum(['target','route','inspect','flag','users','gauge','scope','chart','compare','decision','shield','check','warning']);
export const learningFlowSchema = z.object({title:localizedText,caption:localizedText,steps:z.array(z.object({title:localizedText,detail:localizedText,icon:learningIcon})).min(2)});
export const learningCardsSchema = z.array(z.object({title:localizedText,icon:learningIcon,tone:z.enum(['accent','positive','caution','neutral']).default('accent'),items:z.array(localizedText).min(1)})).min(2);
export const interviewPlanSchema = z.object({duration:z.number().int().positive(),phases:z.array(z.object({id:z.string(),title:localizedText,minutes:z.number().int().positive(),description:localizedText,checklist:z.array(localizedText).min(1)})).length(4)});
export type InterviewPlan=z.infer<typeof interviewPlanSchema>;
const nodeSchema = z.object({
  id: z.string(),
  label: localizedText,
  detail: localizedText,
  x: z.number(),
  y: z.number(),
  kind: z
    .enum(['client', 'edge', 'service', 'store', 'queue', 'worker', 'model'])
    .default('service'),
});
const traceSchema = z.object({
  id: z.string(),
  label: localizedText,
  steps: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        description: localizedText,
        async: z.boolean().optional(),
      }),
    )
    .min(1),
});
export const architectureSchema = z.object({
  id: z.string(),
  title: localizedText,
  caption: localizedText,
  width: z.number().default(1000),
  height: z.number().default(520),
  nodes: z.array(nodeSchema).min(2),
  traces: z.array(traceSchema).min(1),
});
export type Architecture = z.infer<typeof architectureSchema>;
export const reasoningScenarioSchema = z.object({
  id:z.string(),title:localizedText,prompt:localizedText,proposal:localizedText,
  claims:z.array(z.object({id:z.string(),title:localizedText,statement:localizedText,why:localizedText,check:localizedText})).min(4),
});
export type ReasoningScenario=z.infer<typeof reasoningScenarioSchema>;
const sectionSchema = z.object({
  id: z.string(),
  title: localizedText,
  paragraphs: z.array(localizedText).default([]),
  flow: learningFlowSchema.optional(),
  cards: learningCardsSchema.optional(),
  planner: interviewPlanSchema.optional(),
  workshop: z.array(reasoningScenarioSchema).min(2).optional(),
  mock: mockConfigSchema.optional(),
  bullets: z.array(localizedText).optional(),
  table: z
    .object({
      headers: z.array(localizedText),
      rows: z.array(z.array(localizedText)),
      caption: localizedText.optional(),
    })
    .optional(),
  api: z
    .array(
      z.object({
        method: z.string(),
        path: z.string(),
        description: localizedText,
        request: z.string().optional(),
        response: z.string(),
        notes: z.array(localizedText).optional(),
      }),
    )
    .optional(),
  code: z.object({ language: z.string(), content: z.string(), caption: localizedText }).optional(),
  diagram: architectureSchema.optional(),
  stages: z.array(z.object({ id:z.string(), title:localizedText, description:localizedText,
    problem:localizedText.optional(), decision:localizedText.optional(), tradeoff:localizedText.optional(), nextPressure:localizedText.optional(),
    exitCriteria:localizedText, diagram:architectureSchema.optional() })).min(2).optional(),
  callout: z
    .object({
      title: localizedText,
      body: localizedText,
      tone: z.enum(['note', 'warning']).default('note'),
    })
    .optional(),
  questions: z
    .array(
      z.object({
        question: localizedText,
        answer: z.array(localizedText).min(1),
        followup: localizedText.optional(),
      }),
    )
    .optional(),
  experiment: z
    .enum(['feed-fanout', 'kv-budget', 'capacity','context-budget','roofline','availability','interview-plan','latency','handshake','transport','saturation','balancer','hash-ring','cache-eviction','cache-burst','db-isolation','lsm','sharding','replication-lag','quorum','raft','consumer-groups','delivery-crash','offset-gaps','rate-race','counter-race','id-bits','id-locality','dependency-availability','retry-storm','circuit-breaker','url-space','redirect-cache','chat-routing','chat-sync','notification-crash','notification-pipeline','prefix-index','suggestion-race','crawl-frontier','bloom-budget','video-dag','video-abr','video-bandwidth','sync-chunks','sync-conflict','geo-cover','geo-quadtree','merkle-repair','kv-replicas','payment-retry','payment-ledger','payment-reserve','payment-reconcile','board-replay','board-shards','board-read-cut','click-windows','click-sink','booking-nights','booking-expiry','metrics-cardinality','metrics-rollup','metrics-alert','maps-tiles','maps-routing','maps-eta','nearby-fanout','nearby-viewer','nearby-recovery','object-erasure','object-multipart','object-reader','exchange-book','exchange-recovery','exchange-risk','collab-pair','collab-anchors','collab-durable','serving-batch','serving-placement','serving-usage','email-receipt','email-auth','email-spam','email-sync','log-seek','log-replicas','log-visibility','wallet-recovery','wallet-transfer','wallet-holds','sched-fencing','sched-catchup','sched-dst','search-index','search-fanout','search-refresh','netflix-quality','netflix-fill','netflix-live','platform-processor','platform-inbox','platform-migrate','ride-match','ride-claims','ride-location','community-reads','community-fanout','community-resume','photo-ids','photo-publish','photo-stories','checkout-stock','checkout-cart','checkout-cells','audio-start','audio-events','audio-playlist','stay-calendar','stay-quote','stay-cdc','secure-fanout','secure-delivery','secure-membership','design-properties','design-recovery','design-refill','creator-retrieval','creator-codec','creator-prefetch','kv-ranks','kv-pages','kv-prefix','kv-transfer','batch-interference','spec-mass','spec-cost','batch-handoff','parallel-layout','parallel-pipeline','parallel-experts','stack-routing','stack-adapters','stack-economics','prompt-grammar','prompt-validation','prompt-tools','rag-ranks','rag-ivf','rag-publication','tune-plan','tune-budget','tune-cost','eval-pairs','eval-judge','eval-gates','agent-loop','agent-effect','agent-context','prod-stream','prod-cache','prod-cost','security-paths','security-url','security-moderation','enterprise-access','enterprise-revoke','enterprise-migrate','coding-race','coding-context','coding-patch','gateway-route','gateway-failover','gateway-accounting','design-studio','daily-review','glossary','visual-recall','argument-workshop','staff-capacity','mock-interview','question-bank','knowledge-quiz'])
    .optional(),
});
export const handbookSchema = z.object({
  id: z.string(),
  group: z.enum(['foundation', 'building', 'case', 'episode', 'ai', 'practice', 'interview']),
  title: localizedText,
  summary: localizedText,
  prerequisites: z.array(z.string()).default([]),
  relatedTopics: z.array(z.string()).default([]),
  takeaways: z.array(localizedText).min(3),
  overview:learningFlowSchema.optional(),
  sections: z.array(sectionSchema).min(5),
  status: z.enum(['review','complete']),
});
export type HandbookLesson = z.infer<typeof handbookSchema>;
