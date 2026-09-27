CREATE TABLE IF NOT EXISTS public.resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100) NOT NULL,
    description     TEXT,
    owner_id        UUID NOT NULL DEFAULT gen_random_uuid(),
    status          VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id     UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    purpose         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed laboratory assets
INSERT INTO public.resources (name, type, description, status, metadata)
VALUES
  ('Thermo Scientific Orbitrap Mass Spectrometer', 'INSTRUMENT', 'High-resolution mass spectrometry for proteomics and metabolomics.', 'AVAILABLE', '{"location": "Central Analytical Lab (Bldg 4)", "maxDurationHours": 6}'),
  ('MATLAB R2026a High-Performance Compute Cluster', 'COMPUTE', 'Distributed MATLAB compute nodes for large-scale mathematical simulations.', 'AVAILABLE', '{"location": "HPC Data Center Node 2", "maxDurationHours": 8}'),
  ('Biosafety Level 2 (BSL-2) Cell Culture Suite', 'ROOM', 'Sterile cell culture isolation room with biosafety laminar flow cabinets.', 'AVAILABLE', '{"location": "Life Sciences Complex, Rm 204", "maxDurationHours": 4}'),
  ('NVIDIA H100 SXM5 80GB GPU Compute Node', 'GPU', 'Tensor-core accelerator for deep learning training and transformer models.', 'AVAILABLE', '{"location": "Cluster Rack G-14", "maxDurationHours": 12}'),
  ('Illumina NovaSeq 6000 Next-Gen Sequencer', 'INSTRUMENT', 'Ultra-high-throughput genomic sequencer for multi-omics sequencing.', 'AVAILABLE', '{"location": "Genomics Core Facility", "maxDurationHours": 24}'),
  ('NVIDIA Blackwell B200 Superchip Node 01', 'GPU', 'Next-gen enterprise AI superchip for generative multimodal research.', 'AVAILABLE', '{"location": "Cluster Rack B-01", "maxDurationHours": 12}'),
  ('FEI Titan 300kV Transmission Electron Microscope (TEM)', 'INSTRUMENT', 'Atomic-scale imaging and nanoscale structural characterization.', 'AVAILABLE', '{"location": "Nanotechnology Lab Basement", "maxDurationHours": 4}')
ON CONFLICT DO NOTHING;
