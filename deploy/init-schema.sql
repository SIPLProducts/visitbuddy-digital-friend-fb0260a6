--
-- PostgreSQL database dump
--

\restrict uMhN9oI5GzWlTJQE8CWMH9rVEF8QuB93qLwzTC7W76ueiaexYGfXhCxgEtkX7oT

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'operator',
    'gate_security',
    'visitor'
);


--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'completed'
);


--
-- Name: gate_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gate_status AS ENUM (
    'active',
    'inactive'
);


--
-- Name: location_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.location_status AS ENUM (
    'active',
    'inactive'
);


--
-- Name: visitor_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.visitor_status AS ENUM (
    'checked_in',
    'checked_out',
    'scheduled',
    'cancelled',
    'pending_approval'
);


--
-- Name: can_access_location(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_location(_user_id uuid, _location_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT 
        public.is_ho_admin(_user_id) 
        OR EXISTS (
            SELECT 1
            FROM public.user_location_roles
            WHERE user_id = _user_id
              AND location_id = _location_id
        )
$$;


--
-- Name: generate_vehicle_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_vehicle_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.vehicle_id = 'VEH-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FOR 8)) || '-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FOR 4));
    RETURN NEW;
END;
$$;


--
-- Name: generate_visitor_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_visitor_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_plant text;
  v_name  text;
  v_name_token text;
  v_seq   int;
BEGIN
  IF NEW.visitor_id IS NOT NULL AND length(NEW.visitor_id) > 0 THEN
    RETURN NEW;
  END IF;

  SELECT UPPER(REGEXP_REPLACE(COALESCE(l.plant_code, ''), '[^A-Za-z0-9]', '', 'g')),
         COALESCE(l.name, '')
    INTO v_plant, v_name
  FROM public.gates g
  LEFT JOIN public.locations l ON l.id = g.location_id
  WHERE g.id = NEW.gate_id;

  IF v_plant IS NULL OR length(v_plant) = 0 THEN
    v_name_token := UPPER(SUBSTRING(COALESCE(v_name, '') FROM '^[[:space:]]*([0-9]+)'));
    v_plant := COALESCE(
      NULLIF(v_name_token, ''),
      NULLIF(UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(v_name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 6)), '')
    );
  END IF;

  IF v_plant IS NULL OR length(v_plant) = 0 THEN
    v_plant := 'HO';
  END IF;

  INSERT INTO public.visitor_id_counters (location_key, last_seq, updated_at)
  VALUES (v_plant, 1, now())
  ON CONFLICT (location_key) DO UPDATE
    SET last_seq = public.visitor_id_counters.last_seq + 1,
        updated_at = now()
  RETURNING last_seq INTO v_seq;

  NEW.visitor_id := v_plant || '-' || to_char(now(), 'DDMMYY') || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: get_admin_location_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_admin_location_ids(_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT location_id
  FROM public.user_location_roles
  WHERE user_id = _user_id AND role = 'admin'
$$;


--
-- Name: get_user_location_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_location_ids(_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT location_id
    FROM public.user_location_roles
    WHERE user_id = _user_id
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$;


--
-- Name: has_role_at_location(uuid, uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role_at_location(_user_id uuid, _location_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_location_roles
        WHERE user_id = _user_id
          AND location_id = _location_id
          AND role = _role
    )
$$;


--
-- Name: is_ho_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ho_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_location_roles
        WHERE user_id = _user_id
          AND is_ho_admin = true
    )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accompanying_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accompanying_visitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id uuid NOT NULL,
    name text NOT NULL,
    phone text,
    has_laptop boolean DEFAULT false,
    laptop_brand text,
    laptop_serial text,
    created_at timestamp with time zone DEFAULT now(),
    has_mobile boolean DEFAULT false,
    mobile_brand text,
    mobile_serial text
);


--
-- Name: anpr_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anpr_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plate_number text NOT NULL,
    gate_id uuid,
    location_id uuid,
    image_url text,
    matched_vehicle_id uuid,
    match_status text DEFAULT 'unmatched'::text NOT NULL,
    event_time timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_name text NOT NULL,
    visitor_email text,
    visitor_phone text,
    company text,
    host_id uuid,
    department_id uuid,
    purpose text,
    scheduled_date date NOT NULL,
    scheduled_time time without time zone NOT NULL,
    duration_minutes integer DEFAULT 60,
    status public.appointment_status DEFAULT 'pending'::public.appointment_status,
    has_teams_meeting boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    entity_name text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    location_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    location text,
    employee_count integer DEFAULT 0,
    active_visitors integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_id uuid,
    floor_number text,
    building_section text
);


--
-- Name: email_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    smtp_host text NOT NULL,
    smtp_port integer DEFAULT 587 NOT NULL,
    smtp_username text NOT NULL,
    smtp_password text NOT NULL,
    sender_name text DEFAULT ''::text NOT NULL,
    sender_email text NOT NULL,
    use_tls boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject text NOT NULL,
    body text,
    recipients text[] NOT NULL,
    cc text[],
    template text,
    status text DEFAULT 'pending'::text,
    sent_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_key text NOT NULL,
    subject_template text NOT NULL,
    body_template text NOT NULL,
    to_emails text[] DEFAULT '{}'::text[],
    cc_emails text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id text NOT NULL,
    name text NOT NULL,
    email text,
    "position" text,
    department_id uuid,
    is_host boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_id uuid,
    phone text
);


--
-- Name: gates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location_id uuid,
    building text,
    status public.gate_status DEFAULT 'active'::public.gate_status,
    gate_type text DEFAULT 'Entry & Exit'::text,
    has_qr boolean DEFAULT true,
    capacity integer DEFAULT 100,
    current_visitors integer DEFAULT 0,
    operating_hours text DEFAULT '06:00 - 22:00'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    camera_url text,
    camera_type text DEFAULT 'snapshot'::text,
    camera_enabled boolean DEFAULT false
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    city text,
    country text DEFAULT 'India'::text,
    status public.location_status DEFAULT 'active'::public.location_status,
    gate_count integer DEFAULT 0,
    department_count integer DEFAULT 0,
    visitor_count integer DEFAULT 0,
    capacity_usage integer DEFAULT 0,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    geo_address text,
    emergency_contact text,
    assembly_point text
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text,
    is_read boolean DEFAULT false,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_location_id uuid
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    employee_id uuid,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_screen_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_screen_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    role public.app_role NOT NULL,
    screen_id uuid NOT NULL,
    can_view boolean DEFAULT true NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    path text NOT NULL,
    icon text,
    category text,
    description text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    requires_admin boolean DEFAULT false,
    requires_manager boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text DEFAULT 'VisiGuard'::text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#0ea5e9'::text,
    secondary_color text DEFAULT '#10b981'::text,
    badge_logo_url text,
    badge_footer_text text DEFAULT 'Thank you for visiting'::text,
    email_header_text text DEFAULT 'Welcome to our facility'::text,
    email_footer_text text DEFAULT 'This is an automated message'::text,
    nda_text text DEFAULT 'I agree to comply with all facility security policies and procedures. I understand that I must wear my visitor badge at all times and follow all safety regulations during my visit.'::text,
    session_timeout_minutes integer DEFAULT 30,
    data_retention_days integer DEFAULT 30,
    auto_checkout_hours integer DEFAULT 12,
    enable_nda boolean DEFAULT true,
    enable_photo_capture boolean DEFAULT true,
    enable_watchlist_check boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    whatsapp_provider text DEFAULT 'twilio'::text NOT NULL,
    CONSTRAINT tenant_settings_whatsapp_provider_check CHECK ((whatsapp_provider = ANY (ARRAY['twilio'::text, 'whatsapp_web'::text])))
);


--
-- Name: user_location_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_location_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    location_id uuid NOT NULL,
    role public.app_role DEFAULT 'operator'::public.app_role NOT NULL,
    is_ho_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicle_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    gate_id uuid,
    location_id uuid,
    entry_time timestamp with time zone DEFAULT now() NOT NULL,
    exit_time timestamp with time zone,
    purpose text,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicle_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id text NOT NULL,
    vehicle_number text NOT NULL,
    vehicle_type text DEFAULT 'Truck'::text NOT NULL,
    driver_name text NOT NULL,
    driver_phone text,
    company text,
    purpose text,
    status text DEFAULT 'registered'::text,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    gate_id uuid,
    location_id uuid,
    qr_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    driver_license text,
    department_id uuid,
    is_employee_vehicle boolean DEFAULT false,
    employee_id uuid,
    auto_allow boolean DEFAULT false,
    CONSTRAINT vehicles_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'checked_in'::text, 'checked_out'::text])))
);


--
-- Name: visitor_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id uuid NOT NULL,
    agreement_type text DEFAULT 'nda'::text NOT NULL,
    agreement_text text NOT NULL,
    signature_data text,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: visitor_watchlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_watchlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    govt_id_number text,
    company text,
    reason text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    photo_url text,
    is_active boolean DEFAULT true NOT NULL,
    added_by uuid,
    location_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    purpose text,
    host_id uuid,
    department_id uuid,
    gate_id uuid,
    laptop_brand text,
    laptop_serial text,
    has_laptop boolean DEFAULT false,
    status public.visitor_status DEFAULT 'scheduled'::public.visitor_status,
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    badge_printed boolean DEFAULT false,
    qr_code text,
    photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    accompanying_count integer DEFAULT 0,
    has_mobile boolean DEFAULT false,
    mobile_brand text,
    mobile_serial text,
    govt_id_number text,
    vehicle_type text DEFAULT 'by_walk'::text,
    vehicle_number text,
    checkout_method text,
    scheduled_date date DEFAULT CURRENT_DATE,
    created_by_user_id uuid
);


--
-- Name: COLUMN visitors.accompanying_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visitors.accompanying_count IS 'Number of additional people accompanying the main visitor';


--
-- Name: accompanying_visitors accompanying_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accompanying_visitors
    ADD CONSTRAINT accompanying_visitors_pkey PRIMARY KEY (id);


--
-- Name: anpr_events anpr_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anpr_events
    ADD CONSTRAINT anpr_events_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_id_key UNIQUE (employee_id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: gates gates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gates
    ADD CONSTRAINT gates_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: role_screen_permissions role_screen_permissions_location_id_role_screen_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_permissions
    ADD CONSTRAINT role_screen_permissions_location_id_role_screen_id_key UNIQUE (location_id, role, screen_id);


--
-- Name: role_screen_permissions role_screen_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_permissions
    ADD CONSTRAINT role_screen_permissions_pkey PRIMARY KEY (id);


--
-- Name: screens screens_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_path_key UNIQUE (path);


--
-- Name: screens screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions unique_endpoint; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT unique_endpoint UNIQUE (endpoint);


--
-- Name: user_location_roles user_location_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_location_roles
    ADD CONSTRAINT user_location_roles_pkey PRIMARY KEY (id);


--
-- Name: user_location_roles user_location_roles_user_id_location_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_location_roles
    ADD CONSTRAINT user_location_roles_user_id_location_id_key UNIQUE (user_id, location_id);


--
-- Name: vehicle_entries vehicle_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_entries
    ADD CONSTRAINT vehicle_entries_pkey PRIMARY KEY (id);


--
-- Name: vehicle_types vehicle_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_types
    ADD CONSTRAINT vehicle_types_name_key UNIQUE (name);


--
-- Name: vehicle_types vehicle_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_types
    ADD CONSTRAINT vehicle_types_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_vehicle_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vehicle_id_key UNIQUE (vehicle_id);


--
-- Name: visitor_agreements visitor_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_agreements
    ADD CONSTRAINT visitor_agreements_pkey PRIMARY KEY (id);


--
-- Name: visitor_watchlist visitor_watchlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_watchlist
    ADD CONSTRAINT visitor_watchlist_pkey PRIMARY KEY (id);


--
-- Name: visitors visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);


--
-- Name: visitors visitors_visitor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_visitor_id_key UNIQUE (visitor_id);


--
-- Name: idx_agreements_visitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agreements_visitor ON public.visitor_agreements USING btree (visitor_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_vehicle_entries_entry_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_entries_entry_time ON public.vehicle_entries USING btree (entry_time DESC);


--
-- Name: idx_vehicle_entries_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_entries_location_id ON public.vehicle_entries USING btree (location_id);


--
-- Name: idx_vehicle_entries_vehicle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_entries_vehicle_id ON public.vehicle_entries USING btree (vehicle_id);


--
-- Name: idx_vehicles_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_location_id ON public.vehicles USING btree (location_id);


--
-- Name: idx_vehicles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_status ON public.vehicles USING btree (status);


--
-- Name: idx_vehicles_vehicle_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_vehicle_number ON public.vehicles USING btree (vehicle_number);


--
-- Name: idx_watchlist_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_email ON public.visitor_watchlist USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_watchlist_govt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_govt_id ON public.visitor_watchlist USING btree (govt_id_number) WHERE (govt_id_number IS NOT NULL);


--
-- Name: idx_watchlist_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_name ON public.visitor_watchlist USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: idx_watchlist_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watchlist_phone ON public.visitor_watchlist USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: visitors generate_visitor_id_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_visitor_id_trigger BEFORE INSERT ON public.visitors FOR EACH ROW EXECUTE FUNCTION public.generate_visitor_id();


--
-- Name: appointments update_appointments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_config update_email_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_config_updated_at BEFORE UPDATE ON public.email_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_templates update_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gates update_gates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gates_updated_at BEFORE UPDATE ON public.gates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: locations update_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: push_subscriptions update_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: role_screen_permissions update_role_screen_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_role_screen_permissions_updated_at BEFORE UPDATE ON public.role_screen_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: screens update_screens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON public.screens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_location_roles update_user_location_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_location_roles_updated_at BEFORE UPDATE ON public.user_location_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicle_entries update_vehicle_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vehicle_entries_updated_at BEFORE UPDATE ON public.vehicle_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicle_types update_vehicle_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vehicle_types_updated_at BEFORE UPDATE ON public.vehicle_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicles update_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: visitors update_visitors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON public.visitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accompanying_visitors accompanying_visitors_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accompanying_visitors
    ADD CONSTRAINT accompanying_visitors_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES public.visitors(id) ON DELETE CASCADE;


--
-- Name: anpr_events anpr_events_gate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anpr_events
    ADD CONSTRAINT anpr_events_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE SET NULL;


--
-- Name: anpr_events anpr_events_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anpr_events
    ADD CONSTRAINT anpr_events_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: anpr_events anpr_events_matched_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anpr_events
    ADD CONSTRAINT anpr_events_matched_vehicle_id_fkey FOREIGN KEY (matched_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: departments departments_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: gates gates_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gates
    ADD CONSTRAINT gates_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_default_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_default_location_id_fkey FOREIGN KEY (default_location_id) REFERENCES public.locations(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_screen_permissions role_screen_permissions_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_permissions
    ADD CONSTRAINT role_screen_permissions_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: role_screen_permissions role_screen_permissions_screen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_screen_permissions
    ADD CONSTRAINT role_screen_permissions_screen_id_fkey FOREIGN KEY (screen_id) REFERENCES public.screens(id) ON DELETE CASCADE;


--
-- Name: user_location_roles user_location_roles_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_location_roles
    ADD CONSTRAINT user_location_roles_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE RESTRICT;


--
-- Name: vehicle_entries vehicle_entries_gate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_entries
    ADD CONSTRAINT vehicle_entries_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id);


--
-- Name: vehicle_entries vehicle_entries_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_entries
    ADD CONSTRAINT vehicle_entries_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: vehicle_entries vehicle_entries_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_entries
    ADD CONSTRAINT vehicle_entries_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: vehicles vehicles_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: vehicles vehicles_gate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id);


--
-- Name: vehicles vehicles_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: visitors visitors_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: visitors visitors_gate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE SET NULL;


--
-- Name: visitors visitors_host_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: departments Admins can delete departments at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete departments at their locations" ON public.departments FOR DELETE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: employees Admins can delete employees at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete employees at their locations" ON public.employees FOR DELETE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: gates Admins can delete gates at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete gates at their locations" ON public.gates FOR DELETE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: visitor_watchlist Admins can delete watchlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete watchlist entries" ON public.visitor_watchlist FOR DELETE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))));


--
-- Name: departments Admins can insert departments at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert departments at their locations" ON public.departments FOR INSERT TO authenticated WITH CHECK ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: employees Admins can insert employees at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert employees at their locations" ON public.employees FOR INSERT TO authenticated WITH CHECK ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: gates Admins can insert gates at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert gates at their locations" ON public.gates FOR INSERT TO authenticated WITH CHECK ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: visitor_watchlist Admins can insert watchlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert watchlist entries" ON public.visitor_watchlist FOR INSERT TO authenticated WITH CHECK ((public.is_ho_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))));


--
-- Name: vehicle_types Admins can manage vehicle types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage vehicle types" ON public.vehicle_types USING (public.is_ho_admin(auth.uid())) WITH CHECK (public.is_ho_admin(auth.uid()));


--
-- Name: departments Admins can update departments at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update departments at their locations" ON public.departments FOR UPDATE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: gates Admins can update gates at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update gates at their locations" ON public.gates FOR UPDATE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role))))));


--
-- Name: visitor_watchlist Admins can update watchlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update watchlist entries" ON public.visitor_watchlist FOR UPDATE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))));


--
-- Name: visitors Allow public approval updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public approval updates" ON public.visitors FOR UPDATE TO anon USING ((status = 'pending_approval'::public.visitor_status)) WITH CHECK ((status = 'scheduled'::public.visitor_status));


--
-- Name: departments Allow public read for badge printing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read for badge printing" ON public.departments FOR SELECT USING (true);


--
-- Name: employees Allow public read for badge printing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read for badge printing" ON public.employees FOR SELECT USING (true);


--
-- Name: gates Allow public read for badge printing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read for badge printing" ON public.gates FOR SELECT USING (true);


--
-- Name: locations Allow public read for badge printing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read for badge printing" ON public.locations FOR SELECT USING (true);


--
-- Name: visitors Allow public read for badge printing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read for badge printing" ON public.visitors FOR SELECT USING (true);


--
-- Name: visitors Allow public self-service check-in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public self-service check-in" ON public.visitors FOR INSERT TO anon WITH CHECK ((status = ANY (ARRAY['scheduled'::public.visitor_status, 'pending_approval'::public.visitor_status])));


--
-- Name: push_subscriptions Allow read for notification sending; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read for notification sending" ON public.push_subscriptions FOR SELECT USING (true);


--
-- Name: visitor_agreements Anon can insert agreements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can insert agreements" ON public.visitor_agreements FOR INSERT TO anon WITH CHECK (true);


--
-- Name: anpr_events Anon can insert anpr events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can insert anpr events" ON public.anpr_events FOR INSERT TO anon WITH CHECK (true);


--
-- Name: audit_logs Anon can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can insert audit logs" ON public.audit_logs FOR INSERT TO anon WITH CHECK (true);


--
-- Name: visitor_agreements Anon can view agreements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can view agreements" ON public.visitor_agreements FOR SELECT TO anon USING (true);


--
-- Name: tenant_settings Anon can view tenant settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anon can view tenant settings" ON public.tenant_settings FOR SELECT TO anon USING (true);


--
-- Name: anpr_events Authenticated can insert anpr events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert anpr events" ON public.anpr_events FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: email_config Authenticated can view email config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view email config" ON public.email_config FOR SELECT TO authenticated USING (true);


--
-- Name: audit_logs Authenticated users can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: email_logs Authenticated users can insert email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert email logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: email_templates Authenticated users can view active email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active email templates" ON public.email_templates FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: visitor_agreements Authenticated users can view agreements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view agreements" ON public.visitor_agreements FOR SELECT TO authenticated USING (true);


--
-- Name: email_logs Authenticated users can view email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view email logs" ON public.email_logs FOR SELECT TO authenticated USING (true);


--
-- Name: screens Authenticated users can view screens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view screens" ON public.screens FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: tenant_settings Authenticated users can view tenant settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view tenant settings" ON public.tenant_settings FOR SELECT TO authenticated USING (true);


--
-- Name: visitor_watchlist Authenticated users can view watchlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view watchlist" ON public.visitor_watchlist FOR SELECT TO authenticated USING (true);


--
-- Name: locations HO Admins can delete locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can delete locations" ON public.locations FOR DELETE TO authenticated USING (public.is_ho_admin(auth.uid()));


--
-- Name: locations HO Admins can insert locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.is_ho_admin(auth.uid()));


--
-- Name: user_location_roles HO Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can manage all roles" ON public.user_location_roles TO authenticated USING (public.is_ho_admin(auth.uid())) WITH CHECK (public.is_ho_admin(auth.uid()));


--
-- Name: email_config HO Admins can manage email config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can manage email config" ON public.email_config TO authenticated USING (public.is_ho_admin(auth.uid())) WITH CHECK (public.is_ho_admin(auth.uid()));


--
-- Name: email_templates HO Admins can manage email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can manage email templates" ON public.email_templates TO authenticated USING (public.is_ho_admin(auth.uid())) WITH CHECK (public.is_ho_admin(auth.uid()));


--
-- Name: role_screen_permissions HO Admins can manage role screen permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can manage role screen permissions" ON public.role_screen_permissions USING (public.is_ho_admin(auth.uid()));


--
-- Name: screens HO Admins can manage screens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can manage screens" ON public.screens TO authenticated USING (public.is_ho_admin(auth.uid())) WITH CHECK (public.is_ho_admin(auth.uid()));


--
-- Name: tenant_settings HO Admins can manage tenant settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can manage tenant settings" ON public.tenant_settings TO authenticated USING (public.is_ho_admin(auth.uid())) WITH CHECK (public.is_ho_admin(auth.uid()));


--
-- Name: locations HO Admins can update locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can update locations" ON public.locations FOR UPDATE TO authenticated USING (public.is_ho_admin(auth.uid()));


--
-- Name: audit_logs HO Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_ho_admin(auth.uid()));


--
-- Name: profiles HO Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HO Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_ho_admin(auth.uid()));


--
-- Name: user_location_roles Location admins can delete roles at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Location admins can delete roles at their locations" ON public.user_location_roles FOR DELETE TO authenticated USING ((public.has_role_at_location(auth.uid(), location_id, 'admin'::public.app_role) AND (is_ho_admin = false)));


--
-- Name: user_location_roles Location admins can insert roles at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Location admins can insert roles at their locations" ON public.user_location_roles FOR INSERT TO authenticated WITH CHECK ((public.has_role_at_location(auth.uid(), location_id, 'admin'::public.app_role) AND (is_ho_admin = false)));


--
-- Name: role_screen_permissions Location admins can manage permissions at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Location admins can manage permissions at their locations" ON public.role_screen_permissions TO authenticated USING (public.has_role_at_location(auth.uid(), location_id, 'admin'::public.app_role)) WITH CHECK (public.has_role_at_location(auth.uid(), location_id, 'admin'::public.app_role));


--
-- Name: user_location_roles Location admins can update roles at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Location admins can update roles at their locations" ON public.user_location_roles FOR UPDATE TO authenticated USING ((public.has_role_at_location(auth.uid(), location_id, 'admin'::public.app_role) AND (is_ho_admin = false)));


--
-- Name: profiles Location admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Location admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role)))));


--
-- Name: audit_logs Location admins can view audit logs at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Location admins can view audit logs at their locations" ON public.audit_logs FOR SELECT TO authenticated USING ((location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = 'admin'::public.app_role)))));


--
-- Name: user_location_roles Location admins can view roles at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Location admins can view roles at their locations" ON public.user_location_roles FOR SELECT TO authenticated USING ((location_id IN ( SELECT public.get_admin_location_ids(auth.uid()) AS get_admin_location_ids)));


--
-- Name: appointments Managers and Admins can delete appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and Admins can delete appointments" ON public.appointments FOR DELETE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))));


--
-- Name: vehicle_entries Managers and Admins can delete vehicle entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and Admins can delete vehicle entries" ON public.vehicle_entries FOR DELETE USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))));


--
-- Name: vehicles Managers and Admins can delete vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and Admins can delete vehicles" ON public.vehicles FOR DELETE USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))));


--
-- Name: visitors Managers and Admins can delete visitors at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and Admins can delete visitors at their locations" ON public.visitors FOR DELETE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (gate_id IN ( SELECT g.id
   FROM public.gates g
  WHERE (g.location_id IN ( SELECT user_location_roles.location_id
           FROM public.user_location_roles
          WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))))));


--
-- Name: employees Managers and Admins can update employees at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and Admins can update employees at their locations" ON public.employees FOR UPDATE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT user_location_roles.location_id
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.role = ANY (ARRAY['admin'::public.app_role, 'manager'::public.app_role])))))));


--
-- Name: accompanying_visitors Public read for accompanying visitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read for accompanying visitors" ON public.accompanying_visitors FOR SELECT USING (true);


--
-- Name: visitor_agreements Service role can delete agreements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can delete agreements" ON public.visitor_agreements FOR DELETE USING (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) OR public.is_ho_admin(auth.uid())));


--
-- Name: accompanying_visitors Users can delete accompanying visitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete accompanying visitors" ON public.accompanying_visitors FOR DELETE USING ((visitor_id IN ( SELECT visitors.id
   FROM public.visitors)));


--
-- Name: push_subscriptions Users can delete their own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: accompanying_visitors Users can insert accompanying visitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert accompanying visitors" ON public.accompanying_visitors FOR INSERT WITH CHECK ((visitor_id IN ( SELECT visitors.id
   FROM public.visitors)));


--
-- Name: visitor_agreements Users can insert agreements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert agreements" ON public.visitor_agreements FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: appointments Users can insert appointments at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert appointments at their locations" ON public.appointments FOR INSERT TO authenticated WITH CHECK ((public.is_ho_admin(auth.uid()) OR (department_id IS NULL) OR (department_id IN ( SELECT d.id
   FROM public.departments d
  WHERE ((d.location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (d.location_id IS NULL))))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can insert their own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: vehicle_entries Users can insert vehicle entries at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert vehicle entries at their locations" ON public.vehicle_entries FOR INSERT WITH CHECK ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: vehicles Users can insert vehicles at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert vehicles at their locations" ON public.vehicles FOR INSERT WITH CHECK ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: visitors Users can insert visitors at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert visitors at their locations" ON public.visitors FOR INSERT TO authenticated WITH CHECK ((public.is_ho_admin(auth.uid()) OR (gate_id IN ( SELECT g.id
   FROM public.gates g
  WHERE (g.location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)))) OR (gate_id IS NULL)));


--
-- Name: accompanying_visitors Users can update accompanying visitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update accompanying visitors" ON public.accompanying_visitors FOR UPDATE USING ((visitor_id IN ( SELECT visitors.id
   FROM public.visitors)));


--
-- Name: appointments Users can update appointments at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update appointments at their locations" ON public.appointments FOR UPDATE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (department_id IN ( SELECT d.id
   FROM public.departments d
  WHERE (d.location IN ( SELECT l.name
           FROM public.locations l
          WHERE (l.id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)))))) OR (department_id IS NULL)));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: vehicle_entries Users can update vehicle entries at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update vehicle entries at their locations" ON public.vehicle_entries FOR UPDATE USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: vehicles Users can update vehicles at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update vehicles at their locations" ON public.vehicles FOR UPDATE USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: visitors Users can update visitors at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update visitors at their locations" ON public.visitors FOR UPDATE TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (gate_id IN ( SELECT g.id
   FROM public.gates g
  WHERE (g.location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)))) OR (gate_id IS NULL)));


--
-- Name: anpr_events Users can view anpr events at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view anpr events at their locations" ON public.anpr_events FOR SELECT TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: appointments Users can view appointments at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view appointments at their locations" ON public.appointments FOR SELECT TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (department_id IN ( SELECT d.id
   FROM public.departments d
  WHERE (d.location IN ( SELECT l.name
           FROM public.locations l
          WHERE (l.id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)))))) OR (department_id IS NULL)));


--
-- Name: departments Users can view departments at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view departments at their locations" ON public.departments FOR SELECT TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: employees Users can view employees at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view employees at their locations" ON public.employees FOR SELECT TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: gates Users can view gates at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view gates at their locations" ON public.gates FOR SELECT TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: role_screen_permissions Users can view permissions at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view permissions at their locations" ON public.role_screen_permissions FOR SELECT USING ((public.is_ho_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_location_roles
  WHERE ((user_location_roles.user_id = auth.uid()) AND (user_location_roles.location_id = role_screen_permissions.location_id))))));


--
-- Name: locations Users can view their assigned locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their assigned locations" ON public.locations FOR SELECT TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids))));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can view their own push subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_location_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_location_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_ho_admin(auth.uid())));


--
-- Name: vehicle_entries Users can view vehicle entries at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vehicle entries at their locations" ON public.vehicle_entries FOR SELECT USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: vehicle_types Users can view vehicle types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vehicle types" ON public.vehicle_types FOR SELECT USING (true);


--
-- Name: vehicles Users can view vehicles at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vehicles at their locations" ON public.vehicles FOR SELECT USING ((public.is_ho_admin(auth.uid()) OR (location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)) OR (location_id IS NULL)));


--
-- Name: visitors Users can view visitors at their locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view visitors at their locations" ON public.visitors FOR SELECT TO authenticated USING ((public.is_ho_admin(auth.uid()) OR (gate_id IN ( SELECT g.id
   FROM public.gates g
  WHERE (g.location_id IN ( SELECT public.get_user_location_ids(auth.uid()) AS get_user_location_ids)))) OR (gate_id IS NULL)));


--
-- Name: accompanying_visitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accompanying_visitors ENABLE ROW LEVEL SECURITY;

--
-- Name: anpr_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.anpr_events ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: email_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: gates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;

--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_screen_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_screen_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: screens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_location_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_location_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_agreements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitor_agreements ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_watchlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitor_watchlist ENABLE ROW LEVEL SECURITY;

--
-- Name: visitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict uMhN9oI5GzWlTJQE8CWMH9rVEF8QuB93qLwzTC7W76ueiaexYGfXhCxgEtkX7oT

