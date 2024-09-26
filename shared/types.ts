/**
 * This file was generated by kysely-codegen.
 * Please do not edit it manually.
 */

import type { ColumnType } from 'kysely';

export type Generated<T> =
	T extends ColumnType<infer S, infer I, infer U>
		? ColumnType<S, I | undefined, U>
		: ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<string>;

export interface ArchiveArtists {
	archive_id: number;
	artist_id: number;
}

export interface ArchiveCircles {
	archive_id: number;
	circle_id: number;
}

export interface ArchiveEvents {
	archive_id: number;
	event_id: number;
}

export interface ArchiveFts {
	archive_id: number;
	artists: string;
	artists_tsv: Generated<string | null>;
	circles: string;
	circles_tsv: Generated<string | null>;
	events: string;
	events_tsv: Generated<string | null>;
	magazines: string;
	magazines_tsv: Generated<string | null>;
	parodies: string;
	parodies_tsv: Generated<string | null>;
	publishers: string;
	publishers_tsv: Generated<string | null>;
	tags: string;
	tags_tsv: Generated<string | null>;
	title: string;
	title_tsv: Generated<string | null>;
}

export interface ArchiveImages {
	archive_id: number;
	filename: string;
	height: number | null;
	page_number: number;
	width: number | null;
}

export interface ArchiveMagazines {
	archive_id: number;
	magazine_id: number;
}

export interface ArchiveParodies {
	archive_id: number;
	parody_id: number;
}

export interface ArchivePublishers {
	archive_id: number;
	publisher_id: number;
}

export interface Archives {
	created_at: Generated<Timestamp>;
	deleted_at: Timestamp | null;
	description: string | null;
	has_metadata: Generated<boolean | null>;
	hash: string;
	id: Generated<number>;
	language: string | null;
	pages: number;
	path: string;
	released_at: Timestamp | null;
	size: number;
	slug: string;
	thumbnail: Generated<number>;
	title: string;
	updated_at: Generated<Timestamp>;
}

export interface ArchiveSources {
	archive_id: number;
	name: string;
	url: string | null;
}

export interface ArchiveTags {
	archive_id: number;
	namespace: string;
	tag_id: number;
}

export interface Artists {
	id: Generated<number>;
	name: string;
	slug: string;
}

export interface Circles {
	id: Generated<number>;
	name: string;
	slug: string;
}

export interface Events {
	id: Generated<number>;
	name: string;
	slug: string;
}

export interface Magazines {
	id: Generated<number>;
	name: string;
	slug: string;
}

export interface Parodies {
	id: Generated<number>;
	name: string;
	slug: string;
}

export interface Publishers {
	id: Generated<number>;
	name: string;
	slug: string;
}

export interface Tags {
	id: Generated<number>;
	name: string;
	slug: string;
}

export interface TagWeights {
	id: Generated<number>;
	slug: string;
	weight: number;
}

export interface UserCodes {
	code: string;
	consumed_at: Timestamp | null;
	created_at: Generated<Timestamp>;
	type: string;
	user_id: string;
}

export interface UserFavorites {
	archive_id: number;
	created_at: Generated<Timestamp>;
	user_id: string;
}

export interface Users {
	created_at: Generated<Timestamp>;
	email: string | null;
	id: string;
	password_hash: string;
	updated_at: Generated<Timestamp>;
	username: string;
}

export interface UserSessions {
	expires_at: Timestamp;
	id: string;
	user_id: string;
}

export interface DB {
	archive_artists: ArchiveArtists;
	archive_circles: ArchiveCircles;
	archive_events: ArchiveEvents;
	archive_fts: ArchiveFts;
	archive_images: ArchiveImages;
	archive_magazines: ArchiveMagazines;
	archive_parodies: ArchiveParodies;
	archive_publishers: ArchivePublishers;
	archive_sources: ArchiveSources;
	archive_tags: ArchiveTags;
	archives: Archives;
	artists: Artists;
	circles: Circles;
	events: Events;
	magazines: Magazines;
	parodies: Parodies;
	publishers: Publishers;
	tag_weights: TagWeights;
	tags: Tags;
	user_codes: UserCodes;
	user_favorites: UserFavorites;
	user_sessions: UserSessions;
	users: Users;
}
