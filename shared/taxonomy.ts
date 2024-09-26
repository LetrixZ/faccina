export type ReferenceTable =
	| 'artists'
	| 'circles'
	| 'magazines'
	| 'events'
	| 'publishers'
	| 'parodies'
	| 'tags';

export type RelationshipId =
	| 'artist_id'
	| 'circle_id'
	| 'magazine_id'
	| 'event_id'
	| 'publisher_id'
	| 'parody_id'
	| 'tag_id';

export type RelationshipTable =
	| 'archive_artists'
	| 'archive_circles'
	| 'archive_magazines'
	| 'archive_events'
	| 'archive_publishers'
	| 'archive_parodies'
	| 'archive_tags';

export const taxonomyTables: {
	relationId: RelationshipId;
	relationTable: RelationshipTable;
	referenceTable: ReferenceTable;
}[] = [
	{
		relationId: 'artist_id',
		relationTable: 'archive_artists',
		referenceTable: 'artists',
	},
	{
		relationId: 'circle_id',
		relationTable: 'archive_circles',
		referenceTable: 'circles',
	},
	{
		relationId: 'magazine_id',
		relationTable: 'archive_magazines',
		referenceTable: 'magazines',
	},
	{
		relationId: 'event_id',
		relationTable: 'archive_events',
		referenceTable: 'events',
	},
	{
		relationId: 'publisher_id',
		relationTable: 'archive_publishers',
		referenceTable: 'publishers',
	},
	{
		relationId: 'parody_id',
		relationTable: 'archive_parodies',
		referenceTable: 'parodies',
	},
	{
		relationId: 'tag_id',
		relationTable: 'archive_tags',
		referenceTable: 'tags',
	},
];

export enum TaxonomyType {
	Artist = 'a',
	Circle = 'c',
	Magazine = 'm',
	Event = 'e',
	Publisher = 'ps',
	Parody = 'p',
	Tag = 't',
}

export const relationId = (type: TaxonomyType | string): RelationshipId => {
	switch (type) {
		case TaxonomyType.Artist:
			return 'artist_id';
		case TaxonomyType.Circle:
			return 'circle_id';
		case TaxonomyType.Magazine:
			return 'magazine_id';
		case TaxonomyType.Event:
			return 'event_id';
		case TaxonomyType.Publisher:
			return 'publisher_id';
		case TaxonomyType.Parody:
			return 'parody_id';
		case TaxonomyType.Tag:
		default:
			return 'tag_id';
	}
};

export const relationTable = (type: TaxonomyType | string): RelationshipTable => {
	switch (type) {
		case TaxonomyType.Artist:
			return 'archive_artists';
		case TaxonomyType.Circle:
			return 'archive_circles';
		case TaxonomyType.Magazine:
			return 'archive_magazines';
		case TaxonomyType.Event:
			return 'archive_events';
		case TaxonomyType.Publisher:
			return 'archive_publishers';
		case TaxonomyType.Parody:
			return 'archive_parodies';
		case TaxonomyType.Tag:
		default:
			return 'archive_tags';
	}
};

export const referenceTable = (type: TaxonomyType | string): ReferenceTable => {
	switch (type) {
		case TaxonomyType.Artist:
			return 'artists';
		case TaxonomyType.Circle:
			return 'circles';
		case TaxonomyType.Magazine:
			return 'magazines';
		case TaxonomyType.Event:
			return 'events';
		case TaxonomyType.Publisher:
			return 'publishers';
		case TaxonomyType.Parody:
			return 'parodies';
		case TaxonomyType.Tag:
		default:
			return 'tags';
	}
};
