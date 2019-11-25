-- Type: gender
DROP TYPE public.gender CASCADE;

CREATE TYPE public.gender AS ENUM
    ('male', 'female');

ALTER TYPE public.gender
    OWNER TO me;
