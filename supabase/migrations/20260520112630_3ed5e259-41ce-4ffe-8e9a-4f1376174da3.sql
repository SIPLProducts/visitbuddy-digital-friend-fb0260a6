DROP TRIGGER IF EXISTS generate_visitor_id_trigger ON public.visitors;
CREATE TRIGGER generate_visitor_id_trigger
  BEFORE INSERT ON public.visitors
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_visitor_id();