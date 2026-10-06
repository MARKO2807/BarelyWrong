-- The ten topics (docs/SPEC.md, chapter 7). Ids match src/engine/constants.ts.

insert into public.topics (id, name_hr, sort) values
  ('general', 'Opće znanje', 1),
  ('sport', 'Sport', 2),
  ('film_tv', 'Film i TV', 3),
  ('music', 'Glazba', 4),
  ('geography', 'Geografija', 5),
  ('history', 'Povijest', 6),
  ('culture', 'Kultura', 7),
  ('nature', 'Biologija i priroda', 8),
  ('science_tech', 'Znanost i tehnologija', 9),
  ('language_literature', 'Jezik i književnost', 10);
