import React from 'react'

function jitter(center, window, boundMin, boundMax) {
	const tmp = center + (Math.random() * window) - (window / 2)
	return truncate(tmp, boundMin, boundMax)
}

function getY(xpos, slope, intercept) {
	return xpos * slope + intercept
}

function rnd(boundMin, boundMax) {
	return boundMin + (Math.random() * (boundMax - boundMin))
}

function truncate(pos, posMin, posMax) {
	if (posMin == null) posMin = Number.NEGATIVE_INFINITY
	if (posMax == null) posMax = Number.POSITIVE_INFINITY
	return Math.min(Math.max(pos, posMin), posMax)
}

function getMinDistance(a, startMin) {
	let minDistance = startMin
	for (let i = 0; i < a.length - 1; i ++) {
		minDistance = Math.min(
			minDistance,
			Math.sqrt(Math.pow(a[i][0] - a[i+1][0], 2) + Math.pow(a[i][1] - a[i+1][1], 2))
		)
	}
	return minDistance
}

function movePoint(x, y, rho, r, {xMin, xMax, yMin, yMax}={}) {
	return [truncate(x + r * Math.cos(rho), xMin, xMax), truncate(y + r * Math.sin(rho), yMin, yMax)]
}

function ptToString(xy) {
	return xy[0].toFixed(2) + " " + xy[1].toFixed(2)
}

export function RandomHLine({ width, height, options }) {

	const opt = {
		leftPos: 0.5*height,
		leftRoom: 0.3*height,
		rightPos: 0.5*height,
		rightRoom: 0.3*height,
		sections: 1,
		midRoom: 0.2*height,
		angleRoom: Math.PI / 3,
		fillTop: "transparent",
		fillBottom: "transparent",
		strokeMid: "black",
		showHandles: false,
		...options
	}
	
	console.log("options", opt)

	const finalA = jitter(opt.leftPos, opt.leftRoom, 0, height)
	const finalB = jitter(opt.rightPos, opt.rightRoom, 0, height)
	const slope = (finalB - finalA) / width
	const angle = Math.atan(slope)

	const pts_center_x = [...Array(opt.sections + 1).keys()].map(x => x / opt.sections * width)

	const cPoints = [[0, finalA]]
		.concat(pts_center_x.slice(1, opt.sections).map(x => [jitter(x, opt.midRoom, 0, width), jitter(getY(x, slope, finalA), opt.midRoom, 0, height)]))
		.concat([[width, finalB]])

	const distance = getMinDistance(cPoints, 2 * Math.max(width, height))

	let data = Array(opt.sections + 1)
	for (let i = 0; i < cPoints.length; i ++) {
		data[i] = {c: cPoints[i]}
		data[i].angle = jitter(angle, opt.angleRoom)
		data[i].distance = distance
		data[i].ctrl = movePoint(cPoints[i][0], cPoints[i][1], data[i].angle, (i === 0 ? 1 : -1) * distance / 2, {yMin: 0, yMax: height})
		data[i].ctrl_alt = movePoint(cPoints[i][0], cPoints[i][1], data[i].angle, (i === 0 ? -1 : 1) * distance / 2)
	}
	console.log("data", data)

	let midCurve = "C " + ptToString(data[0].ctrl) + ", " + ptToString(data[1].ctrl) + ", " + ptToString(data[1].c) + " "
	for (let i = 2; i < cPoints.length; i ++) {
		midCurve += "S " + ptToString(data[i].ctrl) + ", " + ptToString(data[i].c) + " "
	}

	RandomHLine2({width: 600, height: 300, options: {numControls: 4}, override: ["auto", "auto", {x: ["r", 100, 100]}, "auto"]})
	// RandomHLine2({width: 600, height: 300, options: {numControls: 4}})
	
  return(
		<svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
			<path d={"M 0 0 " + "V " + data[0].c[1].toFixed(2) + " " + midCurve + "V 0 Z"} fill={opt.fillTop} />
			<path d={"M 0 " + height + " " + "V " + data[0].c[1].toFixed(2) + " " + midCurve + "V " + height + " Z"} fill={opt.fillBottom} />
			<path d={"M 0 " + data[0].c[1].toFixed(2) + " " + midCurve} stroke={opt.strokeMid} fill="transparent" />
			{opt.showHandles &&
				// control points
				data.map((x, i) => {
					return(
						<React.Fragment key={"group " + i}>
							{(i === 0 || i === opt.sections) &&
								<line x1={x.ctrl[0]} y1={x.ctrl[1]} x2={x.c[0]} y2={x.c[1]} key={"line " + i} stroke="blue" />
							}
							{i > 0 && i < opt.sections &&
								<line x1={x.ctrl[0]} y1={x.ctrl[1]} x2={x.ctrl_alt[0]} y2={x.ctrl_alt[1]} key={"line " + i} stroke="blue" />
							}
							<circle cx={x.c[0]} cy={x.c[1]} r={4} key={"center " + i} />
							<circle cx={x.ctrl[0]} cy={x.ctrl[1]} r={2} key={"control " + i} />
							{i > 0 && i < opt.sections &&
								<circle cx={x.ctrl_alt[0]} cy={x.ctrl_alt[1]} r={2} key={"control_alt " + i} />
							}
						</React.Fragment>
					)
				})
			}
  	</svg>
  )
}

function compareArrays(a, b) {
	if (a.length != b.length) return false;
	for (let i = 0; i < a.length; i ++) {
		if (a[i] != b[i]) return false;
	}
	return true;
}

function processOverride(override) {

}

function isAuto(entry) {
	return (entry == null || entry === "auto")
}

function preProcessOverride(width, height, opt, override) {

	// There are essentially two modes: exact ("p" and "r" modes) and auto (null and "w" modes).
	// So we can first convert all the p's to r's, and all the nulls to w's (with default window size).

	for (let i = 0; i < override.length; i ++) {
		if (isAuto(override[i])) {
			override[i] = {x: null, y: null, angle: null}
		}

		["x", "y", "angle"].forEach(k => {
			if (isAuto(override[i][k])) {
				if (k === "angle") override[i][k] = ["w", opt.angleWindowSize]
				else override[i][k] = ["w", opt.posWindowSize]
				if (i === 0)
					if (k === "x")
						override[i].x = ["r", 0, 0]
				if (i === override.length - 1)
					if (k === "x")
						override[i].x = ["r", width, width]
			}
			else if (override[i][k][0] === "p") {
				override[i][k] = ["r", override[i][k][1], override[i][k][1]]
			}
		})
	}

}

function RandomHLine2({ width, height, options, override }) {

	// Override is an array of objects.
	// If the entry at position i is null, undefined, or "auto", then default is applied.
	// Each non-auto entry is an object with 3 possible keys: x, y, and angle.
	// Each key has a value that's an array (or null). The first element of the array
	// is the "mode" of overriding. There are 3 possible (non-null) modes:
	// 	- null, undefined, or "auto"
	// 	- ["p", value]: specify the exact value
	// 	- ["w", value]: specify the size of the window
	// 	- ["r", l_bound, u_bound]: specify the minimum and maximum values
	
	const opt = {
		leftPos: 0.5*height,
		rightPos: 0.5*height,
		posWindowSize: 0.2*height,
		angleWindowSize: Math.PI / 3,
		numControls: 2,
		fillTop: "transparent",
		fillBottom: "transparent",
		strokeMid: "black",
		showHandles: false,
		...options
	}

	// preprocess override
	if (!override)
		override = Array(opt.numControls).fill("auto")
	preProcessOverride(width, height, opt, override)
	console.log("post-processed override", override)

	// figure out x points first
	let initX = [...Array(opt.numControls).keys()].map(x => x / (opt.numControls - 1) * width)
			
	// some checks
	if (override.length != opt.numControls) {
		console.warn("Number of control points and the length of the override array are not equal."
			+ " " + "The numControls option will be disregarded.")
		opt.numControls = override.length
		initX = [...Array(opt.numControls).keys()].map(x => x / (opt.numControls - 1) * width)
	}
	// the endpoints must be ["r", x, x]
	if (!compareArrays(override[0]["x"], ["r", 0, 0])) {
		console.error("The first element of override array must have x property of [0, 0].")
	}
	if (!compareArrays(override[opt.numControls - 1]["x"], ["r", width, width])) {
		console.error("The first element of override array must have x property of [0, 0].")
	}

	let lastFixed = 0
	for (let i = 1; i < opt.numControls; i ++) {
		if (override[i].x[0] === "r") {
			initX[i] = (override[i].x[1] + override[i].x[2]) / 2
			if (i - lastFixed > 1) {
				// do linear interpolation from the last fixed point
				const lengthInBetween = (initX[i] - initX[lastFixed]) / (i - lastFixed)
				for (let j = lastFixed + 1; j < i; j ++)
					initX[j] = initX[j - 1] + lengthInBetween
			}
			lastFixed = i
		}
	}

	console.log("initX", initX)




	// now deal with initial slope
	// if (override[0].y == undefined)
	// 	override[0].y = [opt.leftPos - opt.posWindowSize/2, opt.leftPos + opt.posWindowSize/2]
	// if (override[opt.numControls - 1].y == undefined)
	// 	override[opt.numControls - 1].y = [opt.rightPos - opt.posWindowSize/2, opt.leftPos + opt.posWindowSize/2]
	// const finalLeft = rnd(override[0].y[0], override[0].y[1])
	// const finalRight = rnd(override[opt.numControls - 1].y[0], override[opt.numControls - 1].y[1])
	// const slope = (finalRight - finalLeft) / width
	// const angle = Math.atan(slope)



	// for (let i = 1; i < opt.numControls - 1; i ++) {
	// 	if (override[i].x == undefined)
	// 		override[i].x = rnd(initX[i] - opt.posWindowSize/2, initX[i] + opt.posWindowSize/2)
	// 	if (override[i].y == undefined)
	// 		override[i].y = rnd(getY(initX[i], slope, finalLeft) - opt.posWindowSize/2, getY(initX[i], slope, finalLeft) + opt.posWindowSize/2)
	// 	if (override[i].angle == undefined)
	// 		override[i].angle = []
	// }



}
