Eliy Workspace / Company Brain Lite Schema Scaffold

This directory defines schema contracts for future workspace and Company Brain Lite records.

Workspace records may reference OTUnits, objectives, evidence, decisions, review/check records, adjust records, revision intent records, reference assets, process assets, and capabilities.

Company Brain Lite records are structured records for future persistence and retrieval boundaries.

## Design Constraints

- **Schema contracts only.** This directory contains type definitions and interfaces only. No persistence, storage, database migration, or runtime logic is implemented here.
- **No UI added.** No visual components, views, or user interface code.
- **No runtime invocation added.** No function that reads or writes these types is executed at runtime.
- **No provider integration added.** No API client, ORM, query builder, or storage adapter is wired in.
- **No database migration added.** No SQL, schema migration file, or data definition language is present.

## Future Use

These type definitions are intended for:

- Persistence layer integration (future)
- Retrieval boundary contracts (future)
- Company Brain Lite read/write adapters (future)
- UI data binding (future)
