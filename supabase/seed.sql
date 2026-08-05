-- =============================================================
-- SEED · Starter Somali sentences (so the recording queue works)
-- Idempotent. Run after creating the schema (or anytime).
-- =============================================================

insert into public.sentences (text, language, dialect, category, difficulty, source, status)
select x.text, 'so', x.dialect, 'general', x.difficulty, 'seed', 'active'
from (values
  ('Maanta magaalada Muqdisho roob ayaa ka da''ay.', 'maxaa', 1),
  ('Ciyaaraha barrey ayaa aad u xiiso badnaa.',          'maxaa', 1),
  ('Waa inaan daryeelnaa deegaankayaga.',                  'maay',  2),
  ('Carruurtu waa u badan yihiin dalka Soomaaliya.',       'maxaa', 1),
  ('Waxaan jeclahay cuntooyinka dhaqanka Soomaaliyeed.',   'maxaa', 2),
  ('Geela Somaliyeed waxay caan ku yihiin aduunka oo dhan.','maxaa', 2),
  ('Soonku wuxuu bilaabmaa bisheeda Ramadaan.',            'maxaa', 2),
  ('Hoos deg oo naftaada qiftoodina ah.',                   'maay',  3),
  ('Runtu waxay mar walba dhaaftaa hadalka.',              'maxaa', 1),
  ('Beerta ayaa waxay ku dabadabeysaa khudrad kala duwan.','maay',  2),
  ('Caafimaadku waa nolosha, waana inna ilaalino.',       'maxaa', 2),
  ('Gorgor cantuuri ah oo horeeya dalka ayaa la arkey. ','maay', 4),
  ('Socorsthaan iska daaha ka ilaasho inta ayan dhammaan.','maay',  3),
  ('Hoyga qurxiya dhaqanka sooyaalka ahaayoon.',          'maxaa', 3),
  ('Dadka Somalida oo dhan waxay wada sheekstaan.',        'maxaa', 2)
) as s(text, dialect, difficulty)
where not exists (select 1 from public.sentences where lower(text) = lower(s.text));