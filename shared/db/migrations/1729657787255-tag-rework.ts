import { type Kysely } from 'kysely';
import config from '../../config';
import { id, now } from '../helpers';
import { taxonomyTables } from '../../taxonomy';

export async function up(db: Kysely<any>): Promise<void> {
	if (config.database.vendor === 'sqlite') {
		await db.schema.dropIndex('archive_slug').execute();
	}

	await db.schema.alterTable('archives').dropColumn('slug').execute();
	await db.schema.alterTable('archives').dropColumn('has_metadata').execute();

	if (config.database.vendor === 'sqlite') {
		await db.schema.alterTable('archive_sources').addColumn('created_at', 'timestamp').execute();
	} else {
		await db.schema
			.alterTable('archive_sources')
			.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
			.execute();
	}

	await db.schema.alterTable('tags').renameTo('tags_old').execute();
	await db.schema.alterTable('archive_tags').renameTo('archive_tags_old').execute();

	await id(db.schema, 'tags')
		.addColumn('namespace', 'text', (col) => col.notNull())
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('display_name', 'text')
		.addColumn('hidden', 'boolean', (col) => col.notNull().defaultTo(false))
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.addUniqueConstraint('tags_namespace_name', ['namespace', 'name'])
		.execute();

	await db.schema
		.createTable('archive_tags')
		.addColumn('archive_id', 'integer', (col) =>
			col.notNull().references('archives.id').onDelete('cascade')
		)
		.addColumn('tag_id', 'integer', (col) =>
			col.notNull().references('tags.id').onDelete('cascade')
		)
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(now()))
		.execute();

	for (const { relationId, relationTable, referenceTable } of taxonomyTables) {
		if (relationTable === 'archive_tags') {
			continue;
		}

		const archiveTags = await db
			.selectFrom(relationTable)
			.innerJoin(referenceTable, 'id', relationId)
			// @ts-expect-error works
			.select(['archiveId', 'name'])
			.execute();

		const namespace = relationId.split('_')[0];

		for (const tag of archiveTags) {
			let existing = await db
				.selectFrom('tags')
				.where('name', '=', tag.name)
				.where('namespace', '=', namespace)
				.select('id')
				.executeTakeFirst();

			if (!existing) {
				existing = await db
					.insertInto('tags')
					.values({ namespace, name: tag.name })
					.returning('id')
					.executeTakeFirst();
			}

			await db
				.insertInto('archive_tags')
				.values({ archive_id: tag.archiveId, tagId: existing!.id })
				.execute();
		}

		await db.schema.dropTable(relationTable).execute();
		await db.schema.dropTable(referenceTable).execute();
	}

	const archiveTags = await db
		.selectFrom('archive_tags_old')
		.innerJoin('tags_old', 'id', 'tag_id')
		.select(['archiveId', 'name', 'namespace'])
		.execute();

	for (const tag of archiveTags) {
		const namespace = tag.namespace?.length ? tag.namespace.toLowerCase() : 'tag';

		let existing = await db
			.selectFrom('tags')
			.where('name', '=', tag.name)
			.where('namespace', '=', namespace)
			.select('id')
			.executeTakeFirst();

		if (!existing) {
			existing = await db
				.insertInto('tags')
				.values({ namespace, name: tag.name })
				.returning('id')
				.executeTakeFirst();
		}

		await db
			.insertInto('archive_tags')
			.values({ archiveId: tag.archiveId, tagId: existing!.id })
			.execute();
	}

	if (config.database.vendor === 'postgresql') {
		await db.schema.dropTable('tags_old').cascade().execute();
	} else {
		await db.schema.dropTable('tags_old').execute();
	}
	await db.schema.dropTable('archive_tags_old').execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
	// Just don't...
}
