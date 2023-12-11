import("resource:///com/github/Aylur/ags/app.js").then(
	({ default: App }) => App.toggleWindow('launcher')
).catch(err => console.log(err));
