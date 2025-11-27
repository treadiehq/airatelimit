-- Migration: Add flow_config column for visual rule designer
-- This stores the nodes and edges from the drag-and-drop flow builder

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS flow_config JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.flow_config IS 'Visual Flow Designer configuration storing nodes and edges from the drag-and-drop builder';

