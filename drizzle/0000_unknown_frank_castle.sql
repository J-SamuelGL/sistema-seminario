CREATE TABLE `casos_prueba` (
	`id` varchar(36) NOT NULL,
	`problema_id` varchar(36) NOT NULL,
	`argumentos` json NOT NULL,
	`salida_esperada` json NOT NULL,
	`visible` boolean NOT NULL DEFAULT true,
	CONSTRAINT `casos_prueba_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corridas` (
	`id` varchar(36) NOT NULL,
	`usuario_id` varchar(36) NOT NULL,
	`problema_id` varchar(36) NOT NULL,
	`contador` int NOT NULL DEFAULT 0,
	`ultimo_codigo` text,
	`ultimo_lenguaje` text,
	`ultimo_veredicto` enum('pendiente','aceptado','respuesta_incorrecta','error_ejecucion','tiempo_excedido'),
	`ultimos_resultados` json,
	`ultima_ejecucion_en` timestamp,
	CONSTRAINT `corridas_id` PRIMARY KEY(`id`),
	CONSTRAINT `corridas_usuario_problema_unico` UNIQUE(`usuario_id`,`problema_id`)
);
--> statement-breakpoint
CREATE TABLE `cuenta` (
	`id` varchar(36) NOT NULL,
	`usuario_id` varchar(36) NOT NULL,
	`id_cuenta_proveedor` text NOT NULL,
	`id_proveedor` text NOT NULL,
	`contrasena` text,
	`token_acceso` text,
	`token_refresco` text,
	`token_acceso_expira_en` timestamp,
	`token_refresco_expira_en` timestamp,
	`alcance` text,
	`id_token` text,
	`creado_en` timestamp NOT NULL DEFAULT (now()),
	`actualizado_en` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cuenta_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `envios` (
	`id` varchar(36) NOT NULL,
	`usuario_id` varchar(36) NOT NULL,
	`problema_id` varchar(36) NOT NULL,
	`codigo` text NOT NULL,
	`lenguaje` text NOT NULL,
	`estado` enum('pendiente','aceptado','respuesta_incorrecta','error_ejecucion','tiempo_excedido') NOT NULL DEFAULT 'pendiente',
	`estado_progreso` enum('pendiente','completado','aprobado_manual') NOT NULL DEFAULT 'pendiente',
	`resultados` json,
	`aprobado_por_id` varchar(36),
	`aprobado_en` timestamp,
	`creado_en` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `envios_id` PRIMARY KEY(`id`),
	CONSTRAINT `envios_usuario_problema_unico` UNIQUE(`usuario_id`,`problema_id`)
);
--> statement-breakpoint
CREATE TABLE `estado_torneo` (
	`id` int NOT NULL DEFAULT 1,
	`iniciado_en` timestamp,
	`finalizado_en` timestamp,
	CONSTRAINT `estado_torneo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `preguntas_ia` (
	`id` varchar(36) NOT NULL,
	`usuario_id` varchar(36) NOT NULL,
	`problema_id` varchar(36),
	`pregunta` text NOT NULL,
	`respuesta` text NOT NULL,
	`creado_en` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preguntas_ia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `problema_lenguajes` (
	`id` varchar(36) NOT NULL,
	`problema_id` varchar(36) NOT NULL,
	`lenguaje` enum('python','javascript','java','csharp','php') NOT NULL,
	`nombre_funcion` text NOT NULL,
	`codigo_inicial` text NOT NULL,
	CONSTRAINT `problema_lenguajes_id` PRIMARY KEY(`id`),
	CONSTRAINT `problema_lenguajes_unico` UNIQUE(`problema_id`,`lenguaje`)
);
--> statement-breakpoint
CREATE TABLE `problemas` (
	`id` varchar(36) NOT NULL,
	`torneo_id` varchar(36),
	`titulo` text NOT NULL,
	`descripcion` text NOT NULL,
	`dificultad` enum('Fácil','Intermedio','Difícil') NOT NULL,
	`categoria_problema` enum('debugging','normal') NOT NULL DEFAULT 'normal',
	`orden` int NOT NULL DEFAULT 0,
	`grupo` enum('invitado_junior','senior') NOT NULL,
	`puntos` int NOT NULL DEFAULT 10,
	`parametros` json NOT NULL,
	`tipo_retorno` enum('int','float','bool','string','list<int>','list<float>','list<bool>','list<string>') NOT NULL,
	CONSTRAINT `problemas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sesion` (
	`id` varchar(36) NOT NULL,
	`usuario_id` varchar(36) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expira_en` timestamp NOT NULL,
	`creado_en` timestamp NOT NULL DEFAULT (now()),
	`actualizado_en` timestamp NOT NULL DEFAULT (now()),
	`direccion_ip` text,
	`agente_usuario` text,
	CONSTRAINT `sesion_id` PRIMARY KEY(`id`),
	CONSTRAINT `sesion_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `torneos` (
	`id` varchar(36) NOT NULL,
	`anio` int NOT NULL,
	`iniciado_en` timestamp,
	`finalizado_en` timestamp,
	`creado_en` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `torneos_id` PRIMARY KEY(`id`),
	CONSTRAINT `torneos_anio_unique` UNIQUE(`anio`)
);
--> statement-breakpoint
CREATE TABLE `usuario` (
	`id` varchar(36) NOT NULL,
	`nombre` text NOT NULL,
	`email` varchar(255) NOT NULL,
	`correo_verificado` boolean NOT NULL DEFAULT false,
	`imagen` text,
	`creado_en` timestamp NOT NULL DEFAULT (now()),
	`actualizado_en` timestamp NOT NULL DEFAULT (now()),
	`rol` enum('participante','admin') NOT NULL DEFAULT 'participante',
	`categoria` enum('invitado','junior','senior') NOT NULL,
	`carnet` text,
	`semestre` enum('1','2','3','4','5','6','7','8','9','10'),
	`token_ingreso` varchar(255) NOT NULL,
	`ingresado_en` timestamp,
	`preguntas_ia_usadas` int NOT NULL DEFAULT 0,
	`torneo_id` varchar(36),
	`correo_original` text,
	CONSTRAINT `usuario_id` PRIMARY KEY(`id`),
	CONSTRAINT `usuario_email_unique` UNIQUE(`email`),
	CONSTRAINT `usuario_token_ingreso_unique` UNIQUE(`token_ingreso`)
);
--> statement-breakpoint
CREATE TABLE `verificacion` (
	`id` varchar(36) NOT NULL,
	`identificador` text NOT NULL,
	`valor` text NOT NULL,
	`expira_en` timestamp NOT NULL,
	`creado_en` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verificacion_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `casos_prueba` ADD CONSTRAINT `casos_prueba_problema_id_problemas_id_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `corridas` ADD CONSTRAINT `corridas_usuario_id_usuario_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `corridas` ADD CONSTRAINT `corridas_problema_id_problemas_id_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cuenta` ADD CONSTRAINT `cuenta_usuario_id_usuario_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `envios` ADD CONSTRAINT `envios_usuario_id_usuario_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `envios` ADD CONSTRAINT `envios_problema_id_problemas_id_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `envios` ADD CONSTRAINT `envios_aprobado_por_id_usuario_id_fk` FOREIGN KEY (`aprobado_por_id`) REFERENCES `usuario`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preguntas_ia` ADD CONSTRAINT `preguntas_ia_usuario_id_usuario_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `preguntas_ia` ADD CONSTRAINT `preguntas_ia_problema_id_problemas_id_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problema_lenguajes` ADD CONSTRAINT `problema_lenguajes_problema_id_problemas_id_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `problemas` ADD CONSTRAINT `problemas_torneo_id_torneos_id_fk` FOREIGN KEY (`torneo_id`) REFERENCES `torneos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sesion` ADD CONSTRAINT `sesion_usuario_id_usuario_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_torneo_id_torneos_id_fk` FOREIGN KEY (`torneo_id`) REFERENCES `torneos`(`id`) ON DELETE no action ON UPDATE no action;