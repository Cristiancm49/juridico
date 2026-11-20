IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [areas_asesoria] (
        [id] uniqueidentifier NOT NULL,
        [codigo] nvarchar(50) NOT NULL,
        [nombre] nvarchar(150) NOT NULL,
        [descripcion] nvarchar(300) NULL,
        [activo] bit NOT NULL,
        [orden] smallint NOT NULL,
        CONSTRAINT [PK_areas_asesoria] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [periodos_academicos] (
        [id] uniqueidentifier NOT NULL,
        [codigo] nvarchar(20) NOT NULL,
        [nombre] nvarchar(50) NOT NULL,
        [fecha_inicio] date NOT NULL,
        [fecha_fin] date NOT NULL,
        [activo] bit NOT NULL,
        CONSTRAINT [PK_periodos_academicos] PRIMARY KEY ([id]),
        CONSTRAINT [ck_periodo_fechas] CHECK ([fecha_fin] > [fecha_inicio])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [roles] (
        [id] uniqueidentifier NOT NULL,
        [descripcion] nvarchar(300) NULL,
        [rol_sistema] bit NOT NULL DEFAULT CAST(1 AS bit),
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        [name] nvarchar(256) NULL,
        [normalized_name] nvarchar(256) NULL,
        [concurrency_stamp] nvarchar(max) NULL,
        CONSTRAINT [PK_roles] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [usuarios] (
        [id] uniqueidentifier NOT NULL,
        [nombre_completo] nvarchar(200) NOT NULL,
        [activo] bit NOT NULL DEFAULT CAST(1 AS bit),
        [debe_cambiar_contrasena] bit NOT NULL DEFAULT CAST(0 AS bit),
        [ultimo_acceso_en] datetimeoffset NULL,
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        [user_name] nvarchar(256) NULL,
        [normalized_user_name] nvarchar(256) NULL,
        [email] nvarchar(256) NULL,
        [normalized_email] nvarchar(256) NULL,
        [email_confirmed] bit NOT NULL,
        [password_hash] nvarchar(max) NULL,
        [security_stamp] nvarchar(max) NULL,
        [concurrency_stamp] nvarchar(max) NULL,
        [phone_number] nvarchar(max) NULL,
        [phone_number_confirmed] bit NOT NULL,
        [two_factor_enabled] bit NOT NULL,
        [lockout_end] datetimeoffset NULL,
        [lockout_enabled] bit NOT NULL,
        [access_failed_count] int NOT NULL,
        CONSTRAINT [PK_usuarios] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [roles_claims] (
        [id] int NOT NULL IDENTITY,
        [role_id] uniqueidentifier NOT NULL,
        [claim_type] nvarchar(max) NULL,
        [claim_value] nvarchar(max) NULL,
        CONSTRAINT [PK_roles_claims] PRIMARY KEY ([id]),
        CONSTRAINT [FK_roles_claims_roles_role_id] FOREIGN KEY ([role_id]) REFERENCES [roles] ([id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [solicitantes] (
        [id] uniqueidentifier NOT NULL,
        [usuario_id] uniqueidentifier NULL,
        [tipo_documento] nvarchar(20) NOT NULL,
        [numero_documento] nvarchar(50) NOT NULL,
        [nombre_completo] nvarchar(200) NOT NULL,
        [correo_electronico] nvarchar(150) NULL,
        [telefono] nvarchar(50) NULL,
        [activo] bit NOT NULL,
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_solicitantes] PRIMARY KEY ([id]),
        CONSTRAINT [ck_solicitante_tipo_documento] CHECK ([tipo_documento] IN ('CC','CE','TI','NIT')),
        CONSTRAINT [FK_solicitantes_usuarios_usuario_id] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios] ([id]) ON DELETE SET NULL
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [usuarios_claims] (
        [id] int NOT NULL IDENTITY,
        [user_id] uniqueidentifier NOT NULL,
        [claim_type] nvarchar(max) NULL,
        [claim_value] nvarchar(max) NULL,
        CONSTRAINT [PK_usuarios_claims] PRIMARY KEY ([id]),
        CONSTRAINT [FK_usuarios_claims_usuarios_user_id] FOREIGN KEY ([user_id]) REFERENCES [usuarios] ([id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [usuarios_logins] (
        [login_provider] nvarchar(450) NOT NULL,
        [provider_key] nvarchar(450) NOT NULL,
        [provider_display_name] nvarchar(max) NULL,
        [user_id] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_usuarios_logins] PRIMARY KEY ([login_provider], [provider_key]),
        CONSTRAINT [FK_usuarios_logins_usuarios_user_id] FOREIGN KEY ([user_id]) REFERENCES [usuarios] ([id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [usuarios_roles] (
        [user_id] uniqueidentifier NOT NULL,
        [role_id] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_usuarios_roles] PRIMARY KEY ([user_id], [role_id]),
        CONSTRAINT [FK_usuarios_roles_roles_role_id] FOREIGN KEY ([role_id]) REFERENCES [roles] ([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_usuarios_roles_usuarios_user_id] FOREIGN KEY ([user_id]) REFERENCES [usuarios] ([id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [usuarios_tokens] (
        [user_id] uniqueidentifier NOT NULL,
        [login_provider] nvarchar(450) NOT NULL,
        [name] nvarchar(450) NOT NULL,
        [value] nvarchar(max) NULL,
        CONSTRAINT [PK_usuarios_tokens] PRIMARY KEY ([user_id], [login_provider], [name]),
        CONSTRAINT [FK_usuarios_tokens_usuarios_user_id] FOREIGN KEY ([user_id]) REFERENCES [usuarios] ([id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE TABLE [solicitudes_asesoria] (
        [id] uniqueidentifier NOT NULL,
        [radicado] nvarchar(50) NOT NULL,
        [solicitante_id] uniqueidentifier NOT NULL,
        [area_asesoria_id] uniqueidentifier NOT NULL,
        [periodo_academico_id] uniqueidentifier NOT NULL,
        [asunto] nvarchar(250) NOT NULL,
        [descripcion_necesidad] nvarchar(4000) NOT NULL,
        [canal_recepcion] nvarchar(50) NOT NULL,
        [estado] nvarchar(50) NOT NULL,
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        [version] rowversion NOT NULL,
        CONSTRAINT [PK_solicitudes_asesoria] PRIMARY KEY ([id]),
        CONSTRAINT [ck_solicitud_canal] CHECK ([canal_recepcion] IN ('Web','Presencial','Correo','Telefono','Otro')),
        CONSTRAINT [ck_solicitud_estado] CHECK ([estado] IN ('Radicada','PendienteInformacion','EnRevision','Aprobada','Rechazada','Cancelada','Convertida')),
        CONSTRAINT [FK_solicitudes_asesoria_areas_asesoria_area_asesoria_id] FOREIGN KEY ([area_asesoria_id]) REFERENCES [areas_asesoria] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_solicitudes_asesoria_periodos_academicos_periodo_academico_id] FOREIGN KEY ([periodo_academico_id]) REFERENCES [periodos_academicos] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_solicitudes_asesoria_solicitantes_solicitante_id] FOREIGN KEY ([solicitante_id]) REFERENCES [solicitantes] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'descripcion', N'nombre', N'orden') AND [object_id] = OBJECT_ID(N'[areas_asesoria]'))
        SET IDENTITY_INSERT [areas_asesoria] ON;
    EXEC(N'INSERT INTO [areas_asesoria] ([id], [activo], [codigo], [descripcion], [nombre], [orden])
    VALUES (''20000000-0000-0000-0000-000000000001'', CAST(1 AS bit), N''CONT_GENERAL'', NULL, N''Contabilidad general'', CAST(1 AS smallint)),
    (''20000000-0000-0000-0000-000000000002'', CAST(1 AS bit), N''ORG_CONTABLE'', NULL, N''Organizacion contable'', CAST(2 AS smallint)),
    (''20000000-0000-0000-0000-000000000003'', CAST(1 AS bit), N''COSTOS'', NULL, N''Costos'', CAST(3 AS smallint)),
    (''20000000-0000-0000-0000-000000000004'', CAST(1 AS bit), N''INVENTARIOS'', NULL, N''Inventarios'', CAST(4 AS smallint)),
    (''20000000-0000-0000-0000-000000000005'', CAST(1 AS bit), N''EST_FINANC'', NULL, N''Estados financieros'', CAST(5 AS smallint)),
    (''20000000-0000-0000-0000-000000000006'', CAST(1 AS bit), N''FORMALIZ'', NULL, N''Formalizacion contable'', CAST(6 AS smallint)),
    (''20000000-0000-0000-0000-000000000007'', CAST(1 AS bit), N''GEST_DOC'', NULL, N''Gestion documental contable'', CAST(7 AS smallint)),
    (''20000000-0000-0000-0000-000000000008'', CAST(1 AS bit), N''ORIENT_EMP'', NULL, N''Orientacion empresarial'', CAST(8 AS smallint)),
    (''20000000-0000-0000-0000-000000000009'', CAST(1 AS bit), N''OTRA'', NULL, N''Otra'', CAST(9 AS smallint))');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'descripcion', N'nombre', N'orden') AND [object_id] = OBJECT_ID(N'[areas_asesoria]'))
        SET IDENTITY_INSERT [areas_asesoria] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'fecha_fin', N'fecha_inicio', N'nombre') AND [object_id] = OBJECT_ID(N'[periodos_academicos]'))
        SET IDENTITY_INSERT [periodos_academicos] ON;
    EXEC(N'INSERT INTO [periodos_academicos] ([id], [activo], [codigo], [fecha_fin], [fecha_inicio], [nombre])
    VALUES (''10000000-0000-0000-0000-000000000001'', CAST(1 AS bit), N''2026-2'', ''2026-12-15'', ''2026-08-01'', N''Segundo semestre 2026'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'fecha_fin', N'fecha_inicio', N'nombre') AND [object_id] = OBJECT_ID(N'[periodos_academicos]'))
        SET IDENTITY_INSERT [periodos_academicos] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'actualizado_en', N'concurrency_stamp', N'creado_en', N'descripcion', N'name', N'normalized_name', N'rol_sistema') AND [object_id] = OBJECT_ID(N'[roles]'))
        SET IDENTITY_INSERT [roles] ON;
    EXEC(N'INSERT INTO [roles] ([id], [actualizado_en], [concurrency_stamp], [creado_en], [descripcion], [name], [normalized_name], [rol_sistema])
    VALUES (''30000000-0000-0000-0000-000000000001'', ''2026-01-01T00:00:00.0000000+00:00'', NULL, ''2026-01-01T00:00:00.0000000+00:00'', N''Administra la configuracion general del sistema'', N''ADMIN'', N''ADMIN'', CAST(1 AS bit)),
    (''30000000-0000-0000-0000-000000000002'', ''2026-01-01T00:00:00.0000000+00:00'', NULL, ''2026-01-01T00:00:00.0000000+00:00'', N''Consulta reportes e historico institucional'', N''JEFE_PROGRAMA'', N''JEFE_PROGRAMA'', CAST(1 AS bit)),
    (''30000000-0000-0000-0000-000000000003'', ''2026-01-01T00:00:00.0000000+00:00'', NULL, ''2026-01-01T00:00:00.0000000+00:00'', N''Revisa y gestiona solicitudes y casos'', N''COORDINADORA'', N''COORDINADORA'', CAST(1 AS bit)),
    (''30000000-0000-0000-0000-000000000004'', ''2026-01-01T00:00:00.0000000+00:00'', NULL, ''2026-01-01T00:00:00.0000000+00:00'', N''Orienta y revisa los casos asignados'', N''DOCENTE'', N''DOCENTE'', CAST(1 AS bit)),
    (''30000000-0000-0000-0000-000000000005'', ''2026-01-01T00:00:00.0000000+00:00'', NULL, ''2026-01-01T00:00:00.0000000+00:00'', N''Ejecuta y reporta avances de los casos'', N''ESTUDIANTE'', N''ESTUDIANTE'', CAST(1 AS bit)),
    (''30000000-0000-0000-0000-000000000006'', ''2026-01-01T00:00:00.0000000+00:00'', NULL, ''2026-01-01T00:00:00.0000000+00:00'', N''Registra y consulta solicitudes de asesoria'', N''SOLICITANTE'', N''SOLICITANTE'', CAST(1 AS bit))');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'actualizado_en', N'concurrency_stamp', N'creado_en', N'descripcion', N'name', N'normalized_name', N'rol_sistema') AND [object_id] = OBJECT_ID(N'[roles]'))
        SET IDENTITY_INSERT [roles] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE UNIQUE INDEX [IX_areas_asesoria_codigo] ON [areas_asesoria] ([codigo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE UNIQUE INDEX [IX_areas_asesoria_nombre] ON [areas_asesoria] ([nombre]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE UNIQUE INDEX [IX_periodos_academicos_codigo] ON [periodos_academicos] ([codigo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [ux_periodo_academico_activo] ON [periodos_academicos] ([activo]) WHERE [activo] = 1');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [roles] ([normalized_name]) WHERE [normalized_name] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_roles_claims_role_id] ON [roles_claims] ([role_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE UNIQUE INDEX [IX_solicitantes_tipo_documento_numero_documento] ON [solicitantes] ([tipo_documento], [numero_documento]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_solicitantes_usuario_id] ON [solicitantes] ([usuario_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_area_asesoria_id] ON [solicitudes_asesoria] ([area_asesoria_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_creado_en] ON [solicitudes_asesoria] ([creado_en]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_estado] ON [solicitudes_asesoria] ([estado]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_periodo_academico_id] ON [solicitudes_asesoria] ([periodo_academico_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE UNIQUE INDEX [IX_solicitudes_asesoria_radicado] ON [solicitudes_asesoria] ([radicado]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_solicitante_id] ON [solicitudes_asesoria] ([solicitante_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [EmailIndex] ON [usuarios] ([normalized_email]) WHERE [normalized_email] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [usuarios] ([normalized_user_name]) WHERE [normalized_user_name] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_usuarios_claims_user_id] ON [usuarios_claims] ([user_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_usuarios_logins_user_id] ON [usuarios_logins] ([user_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    CREATE INDEX [IX_usuarios_roles_role_id] ON [usuarios_roles] ([role_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103020434_InitialIdentityAndRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103020434_InitialIdentityAndRequests', N'8.0.22');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE TABLE [auditoria_eventos] (
        [id] uniqueidentifier NOT NULL,
        [fecha] datetimeoffset NOT NULL,
        [usuario] nvarchar(200) NOT NULL,
        [modulo] nvarchar(100) NOT NULL,
        [operacion] nvarchar(150) NOT NULL,
        [resultado] nvarchar(50) NOT NULL,
        [detalle] nvarchar(500) NOT NULL,
        CONSTRAINT [PK_auditoria_eventos] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE TABLE [casos_asesoria] (
        [id] uniqueidentifier NOT NULL,
        [numero] nvarchar(50) NOT NULL,
        [solicitante_id] uniqueidentifier NOT NULL,
        [area_asesoria_id] uniqueidentifier NOT NULL,
        [responsable] nvarchar(200) NOT NULL,
        [estado] nvarchar(50) NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_casos_asesoria] PRIMARY KEY ([id]),
        CONSTRAINT [FK_casos_asesoria_areas_asesoria_area_asesoria_id] FOREIGN KEY ([area_asesoria_id]) REFERENCES [areas_asesoria] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_casos_asesoria_solicitantes_solicitante_id] FOREIGN KEY ([solicitante_id]) REFERENCES [solicitantes] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE TABLE [notificaciones] (
        [id] uniqueidentifier NOT NULL,
        [fecha] datetimeoffset NOT NULL,
        [destinatario] nvarchar(200) NOT NULL,
        [tipo] nvarchar(100) NOT NULL,
        [asunto] nvarchar(250) NOT NULL,
        [canal] nvarchar(50) NOT NULL,
        [estado] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_notificaciones] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE TABLE [asignaciones_caso] (
        [id] uniqueidentifier NOT NULL,
        [caso_id] uniqueidentifier NOT NULL,
        [area] nvarchar(150) NOT NULL,
        [docente] nvarchar(200) NOT NULL,
        [estudiante] nvarchar(200) NOT NULL,
        [asignado_en] datetimeoffset NULL,
        [estado] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_asignaciones_caso] PRIMARY KEY ([id]),
        CONSTRAINT [FK_asignaciones_caso_casos_asesoria_caso_id] FOREIGN KEY ([caso_id]) REFERENCES [casos_asesoria] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE TABLE [documentos_caso] (
        [id] uniqueidentifier NOT NULL,
        [caso_id] uniqueidentifier NOT NULL,
        [nombre] nvarchar(250) NOT NULL,
        [categoria] nvarchar(100) NOT NULL,
        [version] nvarchar(20) NOT NULL,
        [responsable] nvarchar(200) NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_documentos_caso] PRIMARY KEY ([id]),
        CONSTRAINT [FK_documentos_caso_casos_asesoria_caso_id] FOREIGN KEY ([caso_id]) REFERENCES [casos_asesoria] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE TABLE [sesiones_asesoria] (
        [id] uniqueidentifier NOT NULL,
        [caso_id] uniqueidentifier NOT NULL,
        [fecha] datetimeoffset NOT NULL,
        [tipo] nvarchar(100) NOT NULL,
        [responsable] nvarchar(200) NOT NULL,
        [compromisos] smallint NOT NULL,
        [estado] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_sesiones_asesoria] PRIMARY KEY ([id]),
        CONSTRAINT [FK_sesiones_asesoria_casos_asesoria_caso_id] FOREIGN KEY ([caso_id]) REFERENCES [casos_asesoria] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE INDEX [IX_asignaciones_caso_caso_id] ON [asignaciones_caso] ([caso_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE INDEX [IX_casos_asesoria_area_asesoria_id] ON [casos_asesoria] ([area_asesoria_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE UNIQUE INDEX [IX_casos_asesoria_numero] ON [casos_asesoria] ([numero]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE INDEX [IX_casos_asesoria_solicitante_id] ON [casos_asesoria] ([solicitante_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE INDEX [IX_documentos_caso_caso_id] ON [documentos_caso] ([caso_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    CREATE INDEX [IX_sesiones_asesoria_caso_id] ON [sesiones_asesoria] ([caso_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103181904_OperationalModules'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103181904_OperationalModules', N'8.0.22');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103214117_DocumentBinaryContent'
)
BEGIN
    ALTER TABLE [documentos_caso] ADD [contenido] varbinary(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103214117_DocumentBinaryContent'
)
BEGIN
    ALTER TABLE [documentos_caso] ADD [mime_type] nvarchar(150) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103214117_DocumentBinaryContent'
)
BEGIN
    ALTER TABLE [documentos_caso] ADD [tamano] bigint NOT NULL DEFAULT CAST(0 AS bigint);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103214117_DocumentBinaryContent'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103214117_DocumentBinaryContent', N'8.0.22');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos_caso] DROP CONSTRAINT [FK_documentos_caso_casos_asesoria_caso_id];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    DROP INDEX [IX_asignaciones_caso_caso_id] ON [asignaciones_caso];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos_caso] DROP CONSTRAINT [PK_documentos_caso];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [auditoria_eventos] DROP CONSTRAINT [PK_auditoria_eventos];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    EXEC sp_rename N'[documentos_caso]', N'documentos';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    EXEC sp_rename N'[auditoria_eventos]', N'registros_auditoria';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    EXEC sp_rename N'[documentos].[IX_documentos_caso_caso_id]', N'IX_documentos_caso_id', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD [actualizado_por] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD [creado_por] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD [empresa_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD [estado_catalogo_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD [fecha_solicitud] date NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitantes] ADD [cargo_o_relacion] nvarchar(150) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitantes] ADD [direccion] nvarchar(250) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitantes] ADD [empresa_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitantes] ADD [municipio] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [notificaciones] ADD [creado_en] datetimeoffset NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [notificaciones] ADD [entidad_id] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [notificaciones] ADD [entidad_relacionada] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [notificaciones] ADD [leido_en] datetimeoffset NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [notificaciones] ADD [mensaje] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [notificaciones] ADD [usuario_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [actualizado_por] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [creado_en] datetimeoffset NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [creado_por] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [descripcion] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [estado_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [fecha_apertura] date NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [fecha_cierre] date NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [solicitud_origen_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD [titulo] nvarchar(250) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD [asignado_por] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD [comentario] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD [desasignado_en] datetimeoffset NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD [docente_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD [estudiante_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [avance_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [cargado_por] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [categoria_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [creado_en] datetimeoffset NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [descripcion] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [es_vigente] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [evaluacion_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [extension] nvarchar(20) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [grupo_documento_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [hash_archivo] nvarchar(128) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [numero_version] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [ruta_almacenamiento] nvarchar(500) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD [solicitud_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [registros_auditoria] ADD [agente_usuario] nvarchar(500) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [registros_auditoria] ADD [direccion_ip] nvarchar(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [registros_auditoria] ADD [entidad_id] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [registros_auditoria] ADD [tipo_entidad] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [registros_auditoria] ADD [usuario_id] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD CONSTRAINT [PK_documentos] PRIMARY KEY ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [registros_auditoria] ADD CONSTRAINT [PK_registros_auditoria] PRIMARY KEY ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [categorias_documento] (
        [id] uniqueidentifier NOT NULL,
        [codigo] nvarchar(50) NOT NULL,
        [nombre] nvarchar(150) NOT NULL,
        [descripcion] nvarchar(300) NULL,
        [activo] bit NOT NULL,
        [orden] smallint NOT NULL,
        CONSTRAINT [PK_categorias_documento] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [docentes] (
        [id] uniqueidentifier NOT NULL,
        [usuario_id] uniqueidentifier NOT NULL,
        [codigo_docente] nvarchar(50) NULL,
        [nombre_completo] nvarchar(200) NOT NULL,
        [correo_institucional] nvarchar(150) NULL,
        [telefono] nvarchar(50) NULL,
        [activo] bit NOT NULL,
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_docentes] PRIMARY KEY ([id]),
        CONSTRAINT [FK_docentes_usuarios_usuario_id] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [empresas] (
        [id] uniqueidentifier NOT NULL,
        [tipo_documento] nvarchar(20) NOT NULL,
        [numero_documento] nvarchar(50) NOT NULL,
        [razon_social] nvarchar(200) NOT NULL,
        [direccion] nvarchar(250) NULL,
        [municipio] nvarchar(100) NULL,
        [telefono] nvarchar(50) NULL,
        [correo_electronico] nvarchar(150) NULL,
        [representante_legal] nvarchar(200) NULL,
        [activo] bit NOT NULL,
        [creado_por] uniqueidentifier NULL,
        [actualizado_por] uniqueidentifier NULL,
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_empresas] PRIMARY KEY ([id]),
        CONSTRAINT [ck_empresa_tipo_doc] CHECK ([tipo_documento] IN ('NIT','CC','CE')),
        CONSTRAINT [FK_empresas_usuarios_actualizado_por] FOREIGN KEY ([actualizado_por]) REFERENCES [usuarios] ([id]),
        CONSTRAINT [FK_empresas_usuarios_creado_por] FOREIGN KEY ([creado_por]) REFERENCES [usuarios] ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [estados_caso] (
        [id] uniqueidentifier NOT NULL,
        [codigo] nvarchar(50) NOT NULL,
        [nombre] nvarchar(100) NOT NULL,
        [descripcion] nvarchar(300) NULL,
        [color] nvarchar(20) NULL,
        [orden] smallint NOT NULL,
        [terminal] bit NOT NULL,
        CONSTRAINT [PK_estados_caso] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [estados_solicitud] (
        [id] uniqueidentifier NOT NULL,
        [codigo] nvarchar(50) NOT NULL,
        [nombre] nvarchar(100) NOT NULL,
        [descripcion] nvarchar(300) NULL,
        [color] nvarchar(20) NULL,
        [orden] smallint NOT NULL,
        [terminal] bit NOT NULL,
        CONSTRAINT [PK_estados_solicitud] PRIMARY KEY ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [estudiantes] (
        [id] uniqueidentifier NOT NULL,
        [usuario_id] uniqueidentifier NOT NULL,
        [codigo_estudiante] nvarchar(50) NULL,
        [nombre_completo] nvarchar(200) NOT NULL,
        [correo_institucional] nvarchar(150) NULL,
        [telefono] nvarchar(50) NULL,
        [programa_academico] nvarchar(150) NOT NULL,
        [semestre] int NULL,
        [activo] bit NOT NULL,
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_estudiantes] PRIMARY KEY ([id]),
        CONSTRAINT [FK_estudiantes_usuarios_usuario_id] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [evaluaciones_servicio] (
        [id] uniqueidentifier NOT NULL,
        [caso_id] uniqueidentifier NOT NULL,
        [solicitante_id] uniqueidentifier NOT NULL,
        [calificacion_general] int NOT NULL,
        [claridad_orientacion] int NULL,
        [oportunidad_atencion] int NULL,
        [utilidad_servicio] int NULL,
        [comentario] nvarchar(max) NULL,
        [recomendaciones] nvarchar(max) NULL,
        [creado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_evaluaciones_servicio] PRIMARY KEY ([id]),
        CONSTRAINT [ck_eval_claridad] CHECK ([claridad_orientacion] IS NULL OR [claridad_orientacion] BETWEEN 1 AND 5),
        CONSTRAINT [ck_eval_general] CHECK ([calificacion_general] BETWEEN 1 AND 5),
        CONSTRAINT [ck_eval_oportunidad] CHECK ([oportunidad_atencion] IS NULL OR [oportunidad_atencion] BETWEEN 1 AND 5),
        CONSTRAINT [ck_eval_utilidad] CHECK ([utilidad_servicio] IS NULL OR [utilidad_servicio] BETWEEN 1 AND 5),
        CONSTRAINT [FK_evaluaciones_servicio_casos_asesoria_caso_id] FOREIGN KEY ([caso_id]) REFERENCES [casos_asesoria] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_evaluaciones_servicio_solicitantes_solicitante_id] FOREIGN KEY ([solicitante_id]) REFERENCES [solicitantes] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [revisiones_solicitud] (
        [id] bigint NOT NULL IDENTITY,
        [solicitud_id] uniqueidentifier NOT NULL,
        [revisado_por] uniqueidentifier NOT NULL,
        [resultado] nvarchar(50) NOT NULL,
        [observacion] nvarchar(max) NULL,
        [fecha_revision] datetimeoffset NOT NULL,
        CONSTRAINT [PK_revisiones_solicitud] PRIMARY KEY ([id]),
        CONSTRAINT [ck_revsol_resultado] CHECK ([resultado] IN ('aprobada','rechazada','requiere_correccion')),
        CONSTRAINT [FK_revisiones_solicitud_solicitudes_asesoria_solicitud_id] FOREIGN KEY ([solicitud_id]) REFERENCES [solicitudes_asesoria] ([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_revisiones_solicitud_usuarios_revisado_por] FOREIGN KEY ([revisado_por]) REFERENCES [usuarios] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [trazabilidad_eventos] (
        [id] bigint NOT NULL IDENTITY,
        [tipo_evento] nvarchar(50) NOT NULL,
        [entidad_tipo] nvarchar(50) NOT NULL,
        [entidad_id] nvarchar(100) NOT NULL,
        [estado_anterior] nvarchar(100) NULL,
        [estado_nuevo] nvarchar(100) NULL,
        [descripcion] nvarchar(300) NOT NULL,
        [observacion] nvarchar(max) NULL,
        [usuario_id] uniqueidentifier NOT NULL,
        [fecha_evento] datetimeoffset NOT NULL,
        CONSTRAINT [PK_trazabilidad_eventos] PRIMARY KEY ([id]),
        CONSTRAINT [FK_trazabilidad_eventos_usuarios_usuario_id] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [avances] (
        [id] uniqueidentifier NOT NULL,
        [caso_id] uniqueidentifier NOT NULL,
        [estudiante_id] uniqueidentifier NOT NULL,
        [tipo_avance] nvarchar(80) NOT NULL,
        [titulo] nvarchar(250) NOT NULL,
        [descripcion] nvarchar(max) NOT NULL,
        [resultado] nvarchar(max) NULL,
        [recomendacion] nvarchar(max) NULL,
        [ocurrido_en] datetimeoffset NOT NULL,
        [creado_por] uniqueidentifier NULL,
        [actualizado_por] uniqueidentifier NULL,
        [creado_en] datetimeoffset NOT NULL,
        [actualizado_en] datetimeoffset NOT NULL,
        CONSTRAINT [PK_avances] PRIMARY KEY ([id]),
        CONSTRAINT [ck_avance_tipo] CHECK ([tipo_avance] IN ('reunion','diagnostico','orientacion','revision_documental','recomendacion','cierre','otro')),
        CONSTRAINT [FK_avances_casos_asesoria_caso_id] FOREIGN KEY ([caso_id]) REFERENCES [casos_asesoria] ([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_avances_estudiantes_estudiante_id] FOREIGN KEY ([estudiante_id]) REFERENCES [estudiantes] ([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_avances_usuarios_actualizado_por] FOREIGN KEY ([actualizado_por]) REFERENCES [usuarios] ([id]),
        CONSTRAINT [FK_avances_usuarios_creado_por] FOREIGN KEY ([creado_por]) REFERENCES [usuarios] ([id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE TABLE [revisiones_avance] (
        [id] bigint NOT NULL IDENTITY,
        [avance_id] uniqueidentifier NOT NULL,
        [docente_id] uniqueidentifier NOT NULL,
        [resultado] nvarchar(50) NOT NULL,
        [observacion] nvarchar(max) NULL,
        [fecha_revision] datetimeoffset NOT NULL,
        CONSTRAINT [PK_revisiones_avance] PRIMARY KEY ([id]),
        CONSTRAINT [ck_revavance_resultado] CHECK ([resultado] IN ('aprobado','rechazado','requiere_correccion')),
        CONSTRAINT [FK_revisiones_avance_avances_avance_id] FOREIGN KEY ([avance_id]) REFERENCES [avances] ([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_revisiones_avance_docentes_docente_id] FOREIGN KEY ([docente_id]) REFERENCES [docentes] ([id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'descripcion', N'nombre', N'orden') AND [object_id] = OBJECT_ID(N'[categorias_documento]'))
        SET IDENTITY_INSERT [categorias_documento] ON;
    EXEC(N'INSERT INTO [categorias_documento] ([id], [activo], [codigo], [descripcion], [nombre], [orden])
    VALUES (''80000000-0000-0000-0000-000000000001'', CAST(1 AS bit), N''DOC_IDENT'', NULL, N''Documento de identificación'', CAST(1 AS smallint)),
    (''80000000-0000-0000-0000-000000000002'', CAST(1 AS bit), N''SOPORTE_SOL'', NULL, N''Soporte de solicitud'', CAST(2 AS smallint)),
    (''80000000-0000-0000-0000-000000000003'', CAST(1 AS bit), N''FORMATO_INST'', NULL, N''Formato institucional'', CAST(3 AS smallint)),
    (''80000000-0000-0000-0000-000000000004'', CAST(1 AS bit), N''EVID_AVANCE'', NULL, N''Evidencia de avance'', CAST(4 AS smallint)),
    (''80000000-0000-0000-0000-000000000005'', CAST(1 AS bit), N''DOC_CONTABLE'', NULL, N''Documento contable'', CAST(5 AS smallint)),
    (''80000000-0000-0000-0000-000000000006'', CAST(1 AS bit), N''INFORME_FINAL'', NULL, N''Reporte final'', CAST(6 AS smallint)),
    (''80000000-0000-0000-0000-000000000007'', CAST(1 AS bit), N''EVAL_SERVICIO'', NULL, N''Evaluación del servicio'', CAST(7 AS smallint)),
    (''80000000-0000-0000-0000-000000000008'', CAST(1 AS bit), N''OTRO'', NULL, N''Otro'', CAST(8 AS smallint))');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'descripcion', N'nombre', N'orden') AND [object_id] = OBJECT_ID(N'[categorias_documento]'))
        SET IDENTITY_INSERT [categorias_documento] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'codigo', N'color', N'descripcion', N'nombre', N'orden', N'terminal') AND [object_id] = OBJECT_ID(N'[estados_caso]'))
        SET IDENTITY_INSERT [estados_caso] ON;
    EXEC(N'INSERT INTO [estados_caso] ([id], [codigo], [color], [descripcion], [nombre], [orden], [terminal])
    VALUES (''70000000-0000-0000-0000-000000000001'', N''ASIGNADO'', NULL, NULL, N''Asignado'', CAST(1 AS smallint), CAST(0 AS bit)),
    (''70000000-0000-0000-0000-000000000002'', N''EN_PROCESO'', NULL, NULL, N''En proceso'', CAST(2 AS smallint), CAST(0 AS bit)),
    (''70000000-0000-0000-0000-000000000003'', N''EN_REV_AVANCE'', NULL, NULL, N''En revisión de avances'', CAST(3 AS smallint), CAST(0 AS bit)),
    (''70000000-0000-0000-0000-000000000004'', N''PEND_CORREC'', NULL, NULL, N''Pendiente corrección'', CAST(4 AS smallint), CAST(0 AS bit)),
    (''70000000-0000-0000-0000-000000000005'', N''FINALIZADO'', NULL, NULL, N''Finalizado'', CAST(5 AS smallint), CAST(1 AS bit)),
    (''70000000-0000-0000-0000-000000000006'', N''CERRADO'', NULL, NULL, N''Cerrado'', CAST(6 AS smallint), CAST(1 AS bit)),
    (''70000000-0000-0000-0000-000000000007'', N''CANCELADO'', NULL, NULL, N''Cancelado'', CAST(7 AS smallint), CAST(1 AS bit)),
    (''70000000-0000-0000-0000-000000000008'', N''REABIERTO'', NULL, NULL, N''Reabierto'', CAST(8 AS smallint), CAST(0 AS bit))');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'codigo', N'color', N'descripcion', N'nombre', N'orden', N'terminal') AND [object_id] = OBJECT_ID(N'[estados_caso]'))
        SET IDENTITY_INSERT [estados_caso] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'codigo', N'color', N'descripcion', N'nombre', N'orden', N'terminal') AND [object_id] = OBJECT_ID(N'[estados_solicitud]'))
        SET IDENTITY_INSERT [estados_solicitud] ON;
    EXEC(N'INSERT INTO [estados_solicitud] ([id], [codigo], [color], [descripcion], [nombre], [orden], [terminal])
    VALUES (''60000000-0000-0000-0000-000000000001'', N''RADICADA'', NULL, NULL, N''Radicada'', CAST(1 AS smallint), CAST(0 AS bit)),
    (''60000000-0000-0000-0000-000000000002'', N''PEND_INFO'', NULL, NULL, N''Pendiente información'', CAST(2 AS smallint), CAST(0 AS bit)),
    (''60000000-0000-0000-0000-000000000003'', N''EN_REVISION'', NULL, NULL, N''En revisión'', CAST(3 AS smallint), CAST(0 AS bit)),
    (''60000000-0000-0000-0000-000000000004'', N''APROBADA'', NULL, NULL, N''Aprobada'', CAST(4 AS smallint), CAST(0 AS bit)),
    (''60000000-0000-0000-0000-000000000005'', N''RECHAZADA'', NULL, NULL, N''Rechazada'', CAST(5 AS smallint), CAST(1 AS bit)),
    (''60000000-0000-0000-0000-000000000006'', N''CANCELADA'', NULL, NULL, N''Cancelada'', CAST(6 AS smallint), CAST(1 AS bit)),
    (''60000000-0000-0000-0000-000000000007'', N''CONVERTIDA'', NULL, NULL, N''Convertida en caso'', CAST(7 AS smallint), CAST(1 AS bit))');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'codigo', N'color', N'descripcion', N'nombre', N'orden', N'terminal') AND [object_id] = OBJECT_ID(N'[estados_solicitud]'))
        SET IDENTITY_INSERT [estados_solicitud] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'fecha_fin', N'fecha_inicio', N'nombre') AND [object_id] = OBJECT_ID(N'[periodos_academicos]'))
        SET IDENTITY_INSERT [periodos_academicos] ON;
    EXEC(N'INSERT INTO [periodos_academicos] ([id], [activo], [codigo], [fecha_fin], [fecha_inicio], [nombre])
    VALUES (''10000000-0000-0000-0000-000000000002'', CAST(0 AS bit), N''2025-2'', ''2025-12-15'', ''2025-08-01'', N''Segundo semestre 2025''),
    (''10000000-0000-0000-0000-000000000003'', CAST(0 AS bit), N''2026-1'', ''2026-06-15'', ''2026-01-20'', N''Primer semestre 2026'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'id', N'activo', N'codigo', N'fecha_fin', N'fecha_inicio', N'nombre') AND [object_id] = OBJECT_ID(N'[periodos_academicos]'))
        SET IDENTITY_INSERT [periodos_academicos] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_actualizado_por] ON [solicitudes_asesoria] ([actualizado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_creado_por] ON [solicitudes_asesoria] ([creado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_empresa_id] ON [solicitudes_asesoria] ([empresa_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_solicitudes_asesoria_estado_catalogo_id] ON [solicitudes_asesoria] ([estado_catalogo_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_solicitantes_empresa_id] ON [solicitantes] ([empresa_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_notificaciones_usuario_id_leido_en] ON [notificaciones] ([usuario_id], [leido_en]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_casos_asesoria_actualizado_por] ON [casos_asesoria] ([actualizado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_casos_asesoria_creado_por] ON [casos_asesoria] ([creado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_casos_asesoria_estado_id] ON [casos_asesoria] ([estado_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_casos_asesoria_solicitud_origen_id] ON [casos_asesoria] ([solicitud_origen_id]) WHERE [solicitud_origen_id] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [ix_asignacion_docente_activo] ON [asignaciones_caso] ([caso_id]) WHERE [docente_id] IS NOT NULL AND [desasignado_en] IS NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_asignaciones_caso_asignado_por] ON [asignaciones_caso] ([asignado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_asignaciones_caso_docente_id] ON [asignaciones_caso] ([docente_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_asignaciones_caso_estudiante_id] ON [asignaciones_caso] ([estudiante_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [ux_asignacion_estudiante_activa] ON [asignaciones_caso] ([caso_id], [estudiante_id]) WHERE [estudiante_id] IS NOT NULL AND [desasignado_en] IS NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_documentos_avance_id] ON [documentos] ([avance_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_documentos_cargado_por] ON [documentos] ([cargado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_documentos_categoria_id] ON [documentos] ([categoria_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_documentos_evaluacion_id] ON [documentos] ([evaluacion_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_documentos_grupo_documento_id_numero_version] ON [documentos] ([grupo_documento_id], [numero_version]) WHERE [grupo_documento_id] IS NOT NULL AND [numero_version] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_documentos_solicitud_id] ON [documentos] ([solicitud_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_registros_auditoria_tipo_entidad_entidad_id] ON [registros_auditoria] ([tipo_entidad], [entidad_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_registros_auditoria_usuario_id] ON [registros_auditoria] ([usuario_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_avances_actualizado_por] ON [avances] ([actualizado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_avances_caso_id] ON [avances] ([caso_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_avances_creado_por] ON [avances] ([creado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_avances_estudiante_id] ON [avances] ([estudiante_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_categorias_documento_codigo] ON [categorias_documento] ([codigo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_categorias_documento_nombre] ON [categorias_documento] ([nombre]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_docentes_usuario_id] ON [docentes] ([usuario_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_empresas_actualizado_por] ON [empresas] ([actualizado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_empresas_creado_por] ON [empresas] ([creado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_empresas_tipo_documento_numero_documento] ON [empresas] ([tipo_documento], [numero_documento]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_estados_caso_codigo] ON [estados_caso] ([codigo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_estados_caso_nombre] ON [estados_caso] ([nombre]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_estados_solicitud_codigo] ON [estados_solicitud] ([codigo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_estados_solicitud_nombre] ON [estados_solicitud] ([nombre]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_estudiantes_usuario_id] ON [estudiantes] ([usuario_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_evaluaciones_servicio_caso_id] ON [evaluaciones_servicio] ([caso_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_evaluaciones_servicio_solicitante_id] ON [evaluaciones_servicio] ([solicitante_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_revisiones_avance_avance_id] ON [revisiones_avance] ([avance_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_revisiones_avance_docente_id] ON [revisiones_avance] ([docente_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_revisiones_solicitud_revisado_por] ON [revisiones_solicitud] ([revisado_por]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_revisiones_solicitud_solicitud_id] ON [revisiones_solicitud] ([solicitud_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_trazabilidad_eventos_entidad_tipo_entidad_id] ON [trazabilidad_eventos] ([entidad_tipo], [entidad_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_trazabilidad_eventos_fecha_evento] ON [trazabilidad_eventos] ([fecha_evento]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_trazabilidad_eventos_tipo_evento] ON [trazabilidad_eventos] ([tipo_evento]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    CREATE INDEX [IX_trazabilidad_eventos_usuario_id] ON [trazabilidad_eventos] ([usuario_id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD CONSTRAINT [FK_asignaciones_caso_docentes_docente_id] FOREIGN KEY ([docente_id]) REFERENCES [docentes] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD CONSTRAINT [FK_asignaciones_caso_estudiantes_estudiante_id] FOREIGN KEY ([estudiante_id]) REFERENCES [estudiantes] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [asignaciones_caso] ADD CONSTRAINT [FK_asignaciones_caso_usuarios_asignado_por] FOREIGN KEY ([asignado_por]) REFERENCES [usuarios] ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD CONSTRAINT [FK_casos_asesoria_estados_caso_estado_id] FOREIGN KEY ([estado_id]) REFERENCES [estados_caso] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD CONSTRAINT [FK_casos_asesoria_solicitudes_asesoria_solicitud_origen_id] FOREIGN KEY ([solicitud_origen_id]) REFERENCES [solicitudes_asesoria] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD CONSTRAINT [FK_casos_asesoria_usuarios_actualizado_por] FOREIGN KEY ([actualizado_por]) REFERENCES [usuarios] ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [casos_asesoria] ADD CONSTRAINT [FK_casos_asesoria_usuarios_creado_por] FOREIGN KEY ([creado_por]) REFERENCES [usuarios] ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD CONSTRAINT [FK_documentos_avances_avance_id] FOREIGN KEY ([avance_id]) REFERENCES [avances] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD CONSTRAINT [FK_documentos_casos_asesoria_caso_id] FOREIGN KEY ([caso_id]) REFERENCES [casos_asesoria] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD CONSTRAINT [FK_documentos_categorias_documento_categoria_id] FOREIGN KEY ([categoria_id]) REFERENCES [categorias_documento] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD CONSTRAINT [FK_documentos_evaluaciones_servicio_evaluacion_id] FOREIGN KEY ([evaluacion_id]) REFERENCES [evaluaciones_servicio] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD CONSTRAINT [FK_documentos_solicitudes_asesoria_solicitud_id] FOREIGN KEY ([solicitud_id]) REFERENCES [solicitudes_asesoria] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [documentos] ADD CONSTRAINT [FK_documentos_usuarios_cargado_por] FOREIGN KEY ([cargado_por]) REFERENCES [usuarios] ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [notificaciones] ADD CONSTRAINT [FK_notificaciones_usuarios_usuario_id] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios] ([id]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [registros_auditoria] ADD CONSTRAINT [FK_registros_auditoria_usuarios_usuario_id] FOREIGN KEY ([usuario_id]) REFERENCES [usuarios] ([id]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitantes] ADD CONSTRAINT [FK_solicitantes_empresas_empresa_id] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD CONSTRAINT [FK_solicitudes_asesoria_empresas_empresa_id] FOREIGN KEY ([empresa_id]) REFERENCES [empresas] ([id]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD CONSTRAINT [FK_solicitudes_asesoria_estados_solicitud_estado_catalogo_id] FOREIGN KEY ([estado_catalogo_id]) REFERENCES [estados_solicitud] ([id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD CONSTRAINT [FK_solicitudes_asesoria_usuarios_actualizado_por] FOREIGN KEY ([actualizado_por]) REFERENCES [usuarios] ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    ALTER TABLE [solicitudes_asesoria] ADD CONSTRAINT [FK_solicitudes_asesoria_usuarios_creado_por] FOREIGN KEY ([creado_por]) REFERENCES [usuarios] ([id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045003_AlignOriginalDatabaseModel'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106045003_AlignOriginalDatabaseModel', N'8.0.22');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045135_BackfillOriginalDatabaseModel'
)
BEGIN
    UPDATE solicitudes_asesoria
    SET estado_catalogo_id = CASE estado
        WHEN 'Radicada' THEN '60000000-0000-0000-0000-000000000001'
        WHEN 'PendienteInformacion' THEN '60000000-0000-0000-0000-000000000002'
        WHEN 'EnRevision' THEN '60000000-0000-0000-0000-000000000003'
        WHEN 'Aprobada' THEN '60000000-0000-0000-0000-000000000004'
        WHEN 'Rechazada' THEN '60000000-0000-0000-0000-000000000005'
        WHEN 'Cancelada' THEN '60000000-0000-0000-0000-000000000006'
        WHEN 'Convertida' THEN '60000000-0000-0000-0000-000000000007'
        ELSE estado_catalogo_id
    END,
    fecha_solicitud = COALESCE(fecha_solicitud, CONVERT(date, creado_en));

    UPDATE casos_asesoria
    SET estado_id = CASE LOWER(estado)
        WHEN 'pendiente' THEN '70000000-0000-0000-0000-000000000001'
        WHEN 'asignado' THEN '70000000-0000-0000-0000-000000000001'
        WHEN 'finalizado' THEN '70000000-0000-0000-0000-000000000005'
        WHEN 'cerrado' THEN '70000000-0000-0000-0000-000000000006'
        WHEN 'cancelado' THEN '70000000-0000-0000-0000-000000000007'
        WHEN 'reabierto' THEN '70000000-0000-0000-0000-000000000008'
        ELSE '70000000-0000-0000-0000-000000000002'
    END,
    titulo = COALESCE(titulo, numero),
    descripcion = COALESCE(descripcion, CONCAT('Caso de asesoría ', numero)),
    fecha_apertura = COALESCE(fecha_apertura, CONVERT(date, actualizado_en)),
    creado_en = COALESCE(creado_en, actualizado_en);

    UPDATE documentos
    SET grupo_documento_id = COALESCE(grupo_documento_id, id),
        numero_version = COALESCE(
            numero_version,
            TRY_CONVERT(int, REPLACE(REPLACE(version, 'v', ''), 'V', '')),
            1),
        es_vigente = 1,
        categoria_id = COALESCE(categoria_id, '80000000-0000-0000-0000-000000000008'),
        creado_en = COALESCE(creado_en, actualizado_en);

    UPDATE notificaciones
    SET creado_en = COALESCE(creado_en, fecha),
        mensaje = COALESCE(mensaje, asunto);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106045135_BackfillOriginalDatabaseModel'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106045135_BackfillOriginalDatabaseModel', N'8.0.22');
END;
GO

COMMIT;
GO

