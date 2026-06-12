type AppState = {
	query: string;
};

export const appState: AppState = $state({
	query: ''
});
