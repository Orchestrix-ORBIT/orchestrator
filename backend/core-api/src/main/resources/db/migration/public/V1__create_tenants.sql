CREATE TABLE public.tenants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(63) NOT NULL UNIQUE,   -- e.g. "acme", "research-lab"
    name          VARCHAR(255) NOT NULL,          -- Display name: "ACME Corp"
    schema_name   VARCHAR(63) NOT NULL UNIQUE,   -- PostgreSQL schema name: "org_acme"
    plan_id       UUID,
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | SUSPENDED | DELETED
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_status ON public.tenants(status);