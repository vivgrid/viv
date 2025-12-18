## Design Objectives

1. Payload Optimization The standard /chat/completions streaming response implementation contains significant data redundancy. Since viv performs extensive compression, the goal is to eliminate as much of this redundant data as possible.

2. Enhanced Execution Transparency While standard /chat/completions responses typically only include the final LLM output, viv integrates intermediate data generated during LLM Tool execution. This provides the AI Agent Client with deeper insights into the execution process, enabling more specialized and context-aware UI rendering.

## Sepc doc

https://github.com/vivgrid/viv/blob/main/packages/viv/spec.md
