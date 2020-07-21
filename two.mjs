import editions from 'editions'
const { requirePackage } = editions
export default requirePackage(
	'.',
	async (path) => {
		console.dir({ path })
		await import(path)
	},
	'test.js',
	{
		each: 'await',
		which: 'all-compatible',
	}
)
