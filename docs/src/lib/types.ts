export type FormValue = {
	directories: {
		content: string;
		images: string;
	};
	database: {
		vendor: string;
		path: string;
		database: string;
		user: string;
		password: string;
		host: string;
		port: number;
	};
	server: {
		logging: string | boolean;
		auto_unpack: boolean;
	};
};
