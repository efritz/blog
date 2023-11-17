+++
title = "Easy Peasy SQL Audit Tables"
slug = "easy-peasy-sql-audit-tables"
date = "2019-12-27T00:00:00-00:00"
tags = ["sql"]
showpagemeta = true
+++

Deposition (described in [a previous article](/articles/deposition)) is a tool used to track the dependencies and vulnerabilities of a software project. This product belongs to a class of tools that benefits greatly from the existence of an [audit log](https://en.wikipedia.org/wiki/Audit_trail).

Most of the time, modifications to data via the API are performed by a build user in the context of a continuous integration system. The API and the UI does allow data to be altered and overridden. Products and builds can be deleted. Dependencies can be flagged and flags can be removed. Admin users can modify team membership and other user's capabilities. Users can create deployment overrides that allow flagged dependencies into a production environment. Some of these actions can be dangerous, and the presence of an audit log can help to undo actions that should not have been performed, and deter actions that are performed outside of good-faith.

The following screenshot shows a view of the audit log. The summary column gives a terse description of the action that was performed, along with links to any foreign entities that still exist.

{{< lightbox src="/images/deposition-audit.png" anchor="deposition-audit" >}}

The following screenshot shows a detailed view of one audit log record, which shows the difference of the values in the database before and after the operation was performed. For a record update, this dialog shows the before-and-after values of the columns that were altered. For creation and deletion of records, this dialog shows the entire record as it was after creation and before deletion, respectively.

{{< lightbox src="/images/deposition-audit-detail.png" anchor="deposition-audit-details" >}}

This remainder of this article outlines how [PostgreSQL](https://www.postgresql.org/) was leveraged to add automatic audit log insertions without changing any application code. The code here is written to work with Deposition, assuming the existence of some external tables and the semantic value of their columns. However, the technique is not tied to any particular schema and can be easily adapted to fit another application using the same database with minimal changes.

### The Table Definition

First, we need to create a table to store audit log records. Each audit log row corresponds to a the modification of a single database row. To track the modifications, we store the table name, the old and new values of the row, the action type (an enum value corresponding to `INSERT`, `UPDATE`, and `DELETE` operations), and the time that the action was performed.

This allows us to know *what* changed in the database, but that's not the useful part of the audit log. Along with each change to the database, we want to store a reference to the user that performed the action, the request ID within the API that triggered the action, and the request *context* (usually an endpoint name) from which the action was performed.

```sql
create type audit_actions AS enum ('insert', 'update', 'delete');

create table audit_logs (
    log_id int primary key,
    user_id int not null references users(user_id),
    request_id text not null,
    request_context text not null,
    table_name text not null,
    action_type audit_actions not null,
    datetime datetime not null,
    old_value jsonb,
    new_value jsonb,
);
```

*In Deposition*, users can be deactivated but cannot be deleted. This table structure may not work for applications that allow users to be completely removed. In the case that the audit log records should not be deleted along with the user, the `user_id` column should be made nullable.

### The Trigger Definitions

Our goal is to avoid having to explicitly write any application-level code that requires insertions into the audit log table prior to a modification of another table. That method may work well if your application only cares about tracking changes to a small subset of critical data, but does not scale. Each line of ORM code or raw SQL statement in the application, as well as any function defined in the database layer that modifies data, would then require a separate audit log insertion statement to be performed transactionally. This greatly reduces the readability of the code, obscuring what data is actually being modified, and the likelihood of missing one insertion is high.

For an audit log over all entities, we need a general solution that is applied automatically in the database layer. This is an excellent use case for database triggers -- each insert, update, and delete operation performed on a table will automatically trigger an insertion into the audit log table. If the statement is part of a transaction, the trigger will only be performed if the transaction is committed.

The following is the definition of the `audit_insert`, `audit_delete`, and `audit_update` functions, which we will later set up on each table to fire after an insert, delete, and update operations, respectively. Each trigger simply inserts a new row into the audit log table. The variables `NEW`, `OLD`, and `TG_TABLE_NAME` are implicit populated on [trigger invocation](https://www.postgresql.org/docs/9.6/plpgsql-trigger.html). The `NEW` variable holds the row values after insertion or update. The `OLD` variable holds the row values before update or deletion. The `TG_TABLE_NAME` is the name of the table to which `NEW` and `OLD` values belong.

In order to track the user and request context, we use [system administration functions](https://www.postgresql.org/docs/9.6/functions-admin.html). Settings can be applied to a session from the API so that each query or operation performed within that session can read the setting values. These triggers assume that the API has set the user id, the request id, and the request context prior to performing a query.

The update case is a bit different than the insert and delete cases. We only want to add an audit log record if a row was *actually* updated. We use a helper function, `num_audit_changes`, to count the number of rows that have changed between `NEW` and `OLD` and only perform an audit log insertion if this value is non-zero. This helper function selects each column name from the jsonified `NEW` value, removes each column for which the `NEW` and `OLD` values are non-distinct, and returns the count of the remaining columns.

```sql
CREATE OR REPLACE FUNCTION audit_insert() RETURNS trigger AS $$ BEGIN
    INSERT INTO audit_logs (
        user_id, request_id, request_context, table_name,
        action_type, datetime, old_value, new_value
    ) VALUES (
        current_setting('settings.api_user_id'),
        current_setting('settings.api_request_id'),
        current_setting('settings.api_request_context'),
        TG_TABLE_NAME,
        'insert',
        now(),
        null,
        to_jsonb(NEW) - 'secret'
    );

    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_delete() RETURNS trigger AS $$ BEGIN
    INSERT INTO audit_logs (
        user_id, request_id, request_context, table_name,
        action_type, datetime, old_value, new_value
    ) VALUES (
        current_setting('settings.api_user_id'),
        current_setting('settings.api_request_id'),
        current_setting('settings.api_request_context'),
        TG_TABLE_NAME,
        'delete',
        now(),
        to_jsonb(OLD) - 'secret',
        null
    );

    RETURN OLD;
END $$ LANGUAGE plpgsql;

create function audit_update() returns trigger as $$ begin
    if num_audit_changes(row_to_json(old), row_to_json(new)) > 0 then
        insert into audit_logs (
            user_id, request_id, request_context, table_name,
            action_type, datetime, old_value, new_value
        ) values (
            current_setting('settings.api_user_id'),
            current_setting('settings.api_request_id'),
            current_setting('settings.api_request_context'),
            tg_table_name,
            'update',
            now(),
            to_jsonb(old) - 'secret',
            to_jsonb(new) - 'secret'
        );
    end if;

    return new;
end $$ language plpgsql;

create function num_audit_changes(
    old_record json,
    new_record json
) returns int as $$ begin
    return (
        select count(*) from
            (select json_object_keys(new_record) as column_name) as columns
        where
            (new_record->column_name #>> '{}') is distinct from
            (old_record->column_name #>> '{}') and
            column_name != all('{active_flagged,active,deploy_flagged,deployed,flagged}')
    );
end $$ language plpgsql;
```

*In Deposition*, we want to remove any sensitive data from the audit log table. This includes a `secret` column on the users table (which is properly bcrypted, but still better not to leak from the application). Because we store old and new row values as binary JSON, it is trivial to remove a column. Additional columns can be removed in the same way.

Additionally, Deposition uses a **highly** denormalized database structure for efficient lookup queries. The `active_flagged`, `active`, `deploy_flagged`, `deployed`, and `flagged` columns are all denormalized boolean columns. We don't want audit logs to show such unnecessary information, so we do not count them as part of the column change count. This set of columns can also be easily altered (although if the column name is ambiguous, it may be necessary to also compare the table name as well).

### The Trigger Applications

For the triggers above to be useful, they need to be applied to a table. For each table `T` in the application for which changes should be tracked, the following three statements must be performed.

```sql
create trigger audit_T_insert after insert on T
    for each row
    execute procedure audit_insert();

create trigger audit_T_update after update on T
    for each row when (old.* is distinct from new.*)
    execute procedure audit_update();

create trigger audit_T_delete before delete on T
    for each row
    execute procedure audit_delete();
```

**A word of caution**: Do **not** track the audit log table itself.

### The API

The last remaining piece, and the only modification to the application code, is to set the user and request context prior to each API request. In Deposition, we did this inside the base class for protected [resources](https://flask-restful.readthedocs.io/en/0.3.6/quickstart.html), after routing and user authentication. This type of query can be performed regardless of framework and language, and API post-authentication middleware generally seems like a secure place to perform this action.

```python
class AuthResource(Resource):
    def auth_middleware(self):
        # ...

        db.session.execute('''
            SET settings.api_user_id TO :user_id;
            SET settings.api_request_id TO :request_id;
            SET settings.api_request_context TO :request_context;
        ''', {
            'user_id': user.user_id,
            'request_id': request.request_id,
            'request_context': request.request_context,
        })

        # ...
```

*In Deposition*, we also have worker processes that could modify the database. The jobs accepted by the worker process were generally tagged with the user and request context that created the job. Some jobs are run on a schedule (CVE scanning, for example), in which case they were given a canned user and a unique request context. The same query above is run after accepting a job to ensure that the audit log is correctly updated with any modifications that are performed asynchronously from the API request.



















CREATE FUNCTION public.audit_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ DECLARE search_string text; BEGIN
    IF num_audit_changes(row_to_json(OLD), row_to_json(NEW)) > 0 THEN
        SELECT INTO search_string string_agg(value, ' ')
            FROM (
                SELECT extract_jsonb(to_jsonb(OLD) - 'secret') AS value UNION
                SELECT extract_jsonb(to_jsonb(NEW) - 'secret') AS value
            ) AS q;
        INSERT INTO audit_logs (user_id, request_id, request_context, table_name, action_type, datetime, old_value, new_value, search_string)
        VALUES (
            CASE WHEN current_setting('settings.api_user_id') <> '' THEN current_setting('settings.api_user_id') ELSE NULL END,
            current_setting('settings.api_request_id'),
            current_setting('settings.api_request_context'),
            TG_TABLE_NAME,
            'update',
            now(),
            to_jsonb(OLD) - 'secret',
            to_jsonb(NEW) - 'secret',
            search_string
        );
    END IF;
    RETURN NEW;
END $$;


CREATE FUNCTION public.extract_jsonb(elem jsonb) RETURNS SETOF text
    LANGUAGE plpgsql
    AS $$ BEGIN
    IF jsonb_typeof(elem) = 'object' THEN

        RETURN QUERY SELECT extract_jsonb(pairs.value) FROM jsonb_each(elem) pairs WHERE pairs.key != ALL ('{"password", "private_key"}');
    ELSIF jsonb_typeof(elem) = 'array' THEN

        RETURN QUERY SELECT extract_jsonb(value) FROM(SELECT jsonb_array_elements(elem) AS value) AS q;
    ELSE

        RETURN QUERY SELECT CAST(elem AS text);
    END IF;
END $$;