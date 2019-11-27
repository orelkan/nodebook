-- Table: public."USERS"

DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 99999999 CACHE 1 ),
    first_name character varying(50) COLLATE pg_catalog."default" NOT NULL,
    last_name character varying(50) COLLATE pg_catalog."default" NOT NULL,
    phone_number character varying(30) COLLATE pg_catalog."default" NOT NULL,
    location point NOT NULL,
    gender gender NOT NULL,
    relationship_status relationship_status NOT NULL,
    interested_in gender NOT NULL,
    CONSTRAINT "USER_ID" PRIMARY KEY (id),
    CONSTRAINT phone_unique UNIQUE (phone_number)
        INCLUDE(first_name, last_name)
)

TABLESPACE pg_default;

ALTER TABLE public.users
    OWNER to me;