module.exports = {
	plugins: {
		autoprefixer: {
			// 自动添加前缀
			overrideBrowserslist: [
				'Chrome > 31',
				'ff > 31',
				'ie >= 8',
				'last 10 versions', // 所有主流浏览器最近10个版本
			],
			grid: true,
		},
		'postcss-pxtorem': {
			// 自适应，px>rem转换
			rootValue: 192, // 1rem的大小
			propList: ['*'], // 需要转换的属性，这里选择全部都进行转换
		},
	},
};
