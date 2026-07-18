# HAC-Agent Compatibility Artifact

Deprecated as a product Agent rule source.

The L0/L1 Kernel still loads this file through `loadHacAgentGovernance()` and exposes its raw text for compatibility. That loader currently returns legacy governance flags from code rather than parsing this document, so the file cannot yet be removed safely.

New Eliy main Agent prompt assembly reads only the bounded projection in `HLAMT.md`. Hard confirmation, permission, state-transition, and canonical-mutation rules remain Runtime responsibilities.
