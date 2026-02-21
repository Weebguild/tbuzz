
CREATE POLICY "Admins can insert universities"
ON public.universities FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update universities"
ON public.universities FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete universities"
ON public.universities FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
