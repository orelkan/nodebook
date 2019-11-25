-- Type: relationship_status

DROP TYPE public.relationship_status CASCADE;

CREATE TYPE public.relationship_status AS ENUM
    ('single', 'in a relationship');

ALTER TYPE public.relationship_status
    OWNER TO me;
