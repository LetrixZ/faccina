export interface Source {
	name: string;
	url?: string;
}

export interface Image {
	filename: string;
	page_number: number;
	width?: number;
	height?: number;
}

export interface Archive {
	title?: string;
	slug?: string;
	description?: string;
	thumbnail?: number;
	language?: string;
	released_at?: Date;
	artists?: string[];
	circles?: string[];
	magazines?: string[];
	events?: string[];
	publishers?: string[];
	parodies?: string[];
	tags?: [string, string][];
	sources?: Source[];
	images?: Image[];
	has_metadata?: boolean;
}
