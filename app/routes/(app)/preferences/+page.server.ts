import db from '~shared/db';

export const load = async () => {
	const artists = await db
		.selectFrom('artists')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const circles = await db
		.selectFrom('circles')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const magazines = await db
		.selectFrom('magazines')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const events = await db
		.selectFrom('events')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const publishers = await db
		.selectFrom('publishers')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const parodies = await db
		.selectFrom('parodies')
		.select(['id', 'slug', 'name'])
		.orderBy('name')
		.execute();

	const tags = await db.selectFrom('tags').select(['id', 'slug', 'name']).orderBy('name').execute();

	return {
		taxonomies: {
			artists,
			circles,
			magazines,
			events,
			publishers,
			parodies,
			tags,
		},
	};
};
