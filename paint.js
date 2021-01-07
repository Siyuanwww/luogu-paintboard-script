const request = require('request');
const Promise = require('bluebird');
const config = require('./config.json');
const url = 'https://www.luogu.com.cn/paintBoard';
const mode = '';
const cookiesCount = config.cookies.length;
const rgb = [ [0, 0, 0], [255, 255, 255], [170, 170, 170], [85, 85, 85], [254, 211, 199], [255, 196, 206], [250, 172, 142], [255, 139, 131], [244, 67, 54], [233, 30, 99], [226, 102, 158], [156, 39, 176], [103, 58, 183], [63, 81, 181], [0, 70, 112], [5, 113, 151], [33, 150, 243], [0, 188, 212], [59, 229, 219], [151, 253, 220], [22, 115, 0], [55, 169, 60], [137, 230, 66], [215, 255, 7], [255, 246, 209], [248, 203, 140], [255, 235, 59], [255, 193, 7], [255, 152, 0], [255, 87, 34], [184, 63, 39], [121, 85, 72] ];


let cookies = config.cookies.map((x) => {
	return {
		cliend_id: x[0],
		uid: x[1],
		stamp: 0,
	};
});

function clone(x) {
	return JSON.parse(JSON.stringify(x));
}
const Request = {
	get: async (url, option = {}) => {
		return await new Promise((resolve) => {
			request.get(url, option, (x, y, z) => {
				resolve(z);
			});
		});
	},
	post: async (url, option = {}) => {
		return await new Promise((resolve) => {
			request.post(url, option, (x, y, z) => {
				resolve(z);
			});
		});
	},
};

async function paint({ x, y, color }, cookie) {
	const result = await Request.post(url + '/paint', {
		headers: {
			cookie: `__client_id=${cookie.cliend_id}; _uid=${cookie.uid}`,
			referer: 'https://www.luogu.com.cn/paintBoard',
		},
		form: {
			x: x,
			y: y,
			color: color,
		},
	});
	const status = result[0] == '{' ? JSON.parse(result).status : -1;
	if (status == 200) {
		cookie.stamp = new Date().getTime();
	}
	return {
		s: status,
		u: cookie.uid,
		x: x,
		y: y,
		c: color,
	};
}

class Task {
	constructor(task) {
		this.X = task.X;
		this.Y = task.Y;
		this.description = task.description;
		this.enable = task.enable;
		this.width = task.image[0].length;
		this.height = task.image.length;
		this.image = task.image;
		this.imageColor = (() => {
			let list = [];
			for (let i = 0; i < this.height; i++) {
				let cur = [];
				for (let j = 0; j < this.width; j++) {
					cur.push(convert(this.image[i][j]));
				}
				list.push(cur);
			}
			return list;
		})();
		this.getDiff = (board) => {
			const convert = (ch) => {
				ch = ch.charCodeAt();
				return ch > 57 ? ch - 87 : ch - 48;
			};
			const dist = (a, b) => {
				return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
			};
			let list = [];
			for (let i = 0; i < this.height; i++) {
				for (let j = 0; j < this.width; j++) {
					let c = board[this.X + j][this.Y + i];
					if (c != this.image[i][j]) {
						list.push({
							x: this.X + j,
							y: this.Y + i,
							color: this.imageColor[i][j],
							dist: dist(rgb[this.imageColor[i][j]], rgb[convert(c)]),
						});
					}
				}
			}
			const shuffle = (list) => {
				const n = list.length;
				for (let i = 1; i < n; i++) {
					const j = Math.floor(Math.random() * i);
					const tmp = list[i];
					list[i] = list[j];
					list[j] = tmp;
				}
				return list;
			};
			return mode == 'shuffle' ? shuffle(list) : mode == 'dist' ? list.sort((a, b) => b.dist - a.dist) : list;
		};
		this.start = async (board) => {
			const diff = this.getDiff(board);
			const currentTime = new Date().getTime();
			let queue = [];
			for (let i = 0, j = 0; i < cookiesCount && j < diff.length; i++) {
				if (currentTime - cookies[i].stamp > 31000) {
					queue.push({ grid: diff[j], cookie: cookies[i] });
					j++;
				}
			}
			if (queue.length > 0) {
				console.log(`---------- ${this.description} ----------`);
			}
			for (; queue.length > 0; ) {
				const len = Math.min(queue.length, 10);
				await Promise.all(queue.splice(0, len).map(({ grid, cookie }) => {
					return paint(grid, cookie);
				})).then((result) => {
					console.log(result);
				});
				await new Promise((resolve) => {
					setTimeout(() => {
						resolve();
					}, 200);
				});
			}
		};
	};
};

const tasksCount = config.tasks.length;
let tasks = config.tasks.map((task) => {
	return new Task(task);
});

async function run() {
	const second = 6;
	setInterval(async () => {
		const board = (await Request.get(url + '/board', {
			headers: {
				referer: 'https://www.luogu.com.cn/paintBoard',
			},
		})).split('\n');
		if (board) {
			for (let i = 0; i < tasksCount; i++) {
				if (tasks[i].enable) {
					await tasks[i].start(board);
				}
			}
		}
	}, second * 1000);
}

run();