ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note text;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_approval_status_check;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected'));

DROP POLICY IF EXISTS "Admins can update report approval" ON public.reports;
CREATE POLICY "Admins can update report approval"
ON public.reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;