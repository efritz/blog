+++
title = "Schema Design - Part 1: Trigger-based SQL"
slug = "schema-design-sql"
date = "2024-10-08T00:00:00-00:00"
tags = ["schema-design", "sql"]
showpagemeta = true
+++

TODO

## Deposition

TODO

[earlier post](https://eric-fritz.com/articles/deposition/)

[earlier post](https://eric-fritz.com/articles/easy-peasy-sql-audit-tables/)


{{< lightbox src="/images/schema-design/deposition-schema.png" anchor="deposition-schema" >}}

TODO - After insert, update, delete on builds:

```sql
CREATE FUNCTION update_product(
    target_team_id integer, target_name text
) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
    UPDATE products p
    SET
        active = ep.active,
        deployed = ep.deployed,
        flagged = ep.flagged,
        active_flagged = ep.active_flagged,
        deploy_flagged = ep.deploy_flagged
    FROM expanded_products ep
    WHERE
        ep.team_id = target_team_id AND p.team_id = target_team_id AND
        ep.name = target_name AND p.name = target_name;
END $$;

CREATE VIEW expanded_products AS
    SELECT
        p.team_id,
        p.name,
        COALESCE(bool_or(b.active), false) AS active,
        COALESCE(bool_or(b.deployed), false) AS deployed,
        COALESCE(bool_or(b.flagged), false) AS flagged,
        COALESCE(bool_or((b.active AND b.flagged)), false) AS active_flagged,
        COALESCE(bool_or((b.deployed AND b.flagged)), false) AS deploy_flagged
    FROM products p
    LEFT JOIN builds b ON ...
    GROUP BY p.team_id, p.name;
```

TODO / After insert on builds, insert/delte on build deployments

```sql
CREATE FUNCTION set_active_build(
    target_team_id integer, target_name text
) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
    UPDATE builds b
    SET active = EXISTS (
        SELECT 1 FROM build_deployments d WHERE
            d.build_product_name = b.product_name AND
            d.build_version = b.version AND
            d.build_token = b.build_token
    ) OR EXISTS (
        SELECT 1 FROM active_builds ab WHERE
            b.product_name = ab.product_name AND
            b.version = ab.version AND
            b.build_token = ab.build_token
        )
    WHERE
        b.product_team_id = target_team_id AND
        b.product_name = target_name;
END $$;

CREATE VIEW active_builds AS
    SELECT b.* FROM products p JOIN builds b
        ON ...
        AND NOT EXISTS (
            SELECT 1 FROM builds cmp WHERE
                cmp.product_team_id = p.team_id AND cmp.product_name = p.name AND
                cmp.build_datetime > b.build_datetime
        )
    ORDER BY b.build_datetime DESC;
```

TODO / After insert, delete on build_deployments

```sql
CREATE FUNCTION update_build_deployment(
    target_team_id integer, target_name text,
    target_version text, target_build_token text
) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
    UPDATE builds b
    SET deployed = bd.deployed
    FROM expanded_build_deployments bd
    WHERE
        bd.product_team_id = target_team_id AND b.product_team_id = target_team_id AND
        bd.product_name = target_name AND b.product_name = target_name AND
        bd.version = target_version AND b.version = target_version AND
        bd.build_token = target_build_token AND b.build_token = target_build_token;
END $$;

CREATE VIEW expanded_build_deployments AS
    SELECT
        b.product_team_id,
        b.product_name,
        b.version,
        b.build_token,
        (count(bd.deployment_token) > 0) AS deployed
    FROM builds b
    LEFT JOIN build_deployments bd ON ...
    GROUP BY b.product_team_id, b.product_name, b.version, b.build_token;
```

TODO / After insert/update/delete on dependency_versions and dependency_version_flags

```sql
CREATE FUNCTION update_dependencies(
    target_source text, target_name text
) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
    UPDATE dependencies d
    SET flagged = ed.flagged
    FROM expanded_dependencies ed
    WHERE
        ed.source = target_source AND d.source = target_source AND
        ed.name = target_name AND d.name = target_name;
END $$;

CREATE VIEW expanded_dependencies AS
    SELECT
        d.source,
        d.name,
        EXISTS (
            SELECT 1 FROM dependency_version_flags dvf WHERE
                d.source = dvf.dependency_version_source AND
                d.name = dvf.dependency_version_name
        ) AS flagged
    FROM dependencies d;
```

TODO / After insert/update/delete on dependency_version_flags

```sql
CREATE FUNCTION update_build(
    target_team_id integer, target_name text,
    target_version text, target_build_token text
) RETURNS void LANGUAGE plpgsql AS $$ DECLARE items RECORD; BEGIN
    UPDATE builds b
    SET flagged = eb.flagged
    FROM expanded_builds eb
    WHERE
        eb.product_team_id = target_team_id AND b.product_team_id = target_team_id AND
        eb.product_name = target_name AND b.product_name = target_name AND
        eb.version = target_version AND b.version = target_version AND
        eb.build_token = target_build_token AND b.build_token = target_build_token;
END $$;

CREATE VIEW expanded_builds AS
    SELECT
        b.product_team_id,
        b.product_name,
        b.version,
        b.build_token,
        (count(DISTINCT dvf.dependency_version_flag_id) > 0) AS flagged
    FROM
        (
            builds b
            LEFT JOIN build_dependency_versions bdv ON ...
            LEFT JOIN dependency_versions v ON ...
            LEFT JOIN dependency_version_flags dvf ON
                ... AND
                (dvf.apply_globally OR dvf.team_id = b.product_team_id)
        )
    GROUP BY b.product_team_id, b.product_name, b.version, b.build_token;
```

TODO
