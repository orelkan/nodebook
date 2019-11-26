-- Table: public."HOBBIES"

DROP TABLE public.hobbies CASCADE;

CREATE TABLE public.hobbies
(
    user_id integer NOT NULL,
    hobby character varying(256) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT user_id FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.hobbies
    OWNER to me;