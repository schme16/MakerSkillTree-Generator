angular.module('Maker Skill Tree', [])

	/*The master controller*/
	.controller('master', ($scope, $sce) => {
		m = $scope

		m.data = {
			title: '',
			credits: 'STEPH PIPER - MAKERQUEEN AU',
			items: {}
		}

		//Trust a string as rendereable HTML
		m.trustAsHtml = $sce.trustAsHtml

		m.convertPolyToPath = (poly) => {
			let svgNS = poly.ownerSVGElement.namespaceURI,
				path = document.createElementNS(svgNS, 'path'),
				pathdata = 'M ' + poly.getAttribute('points')

			if (poly.tagName == 'polygon') {
				pathdata += 'z'
			}
			path.setAttribute('d', pathdata)

			poly.getAttributeNames().forEach((name) => {
				if (name !== 'points') {
					path.setAttribute(name, poly.getAttribute(name))
				}
			})

			poly.parentNode.replaceChild(path, poly)
		}

		m.getTopLeftPointOfPath = (pathElement) => {
			const pathData = pathElement.getAttribute('d');
			const commands = pathData.match(/[a-zA-Z][^a-zA-Z]*/g);

			let minX = Infinity;
			let minY = Infinity;

			commands.forEach(command => {
				const type = command[0];
				const points = command.slice(1).trim().split(/[\s,]+/).map(Number);

				if (['M', 'L', 'T'].includes(type)) {
					for (let i = 0; i < points.length; i += 2) {
						const x = points[i];
						const y = points[i + 1];
						if (x < minX) {
							minX = x;
						}
						if (y < minY) {
							minY = y;
						}
					}
				}
				else if (['H'].includes(type)) {
					points.forEach(x => {
						if (x < minX) {
							minX = x;
						}
					});
				}
				else if (['V'].includes(type)) {
					points.forEach(y => {
						if (y < minY) {
							minY = y;
						}
					});
				}
				else if (['C', 'S', 'Q', 'A'].includes(type)) {
					for (let i = 0; i < points.length; i += 2) {
						const x = points[i];
						const y = points[i + 1];
						if (x < minX) {
							minX = x;
						}
						if (y < minY) {
							minY = y;
						}
					}
				}
				else if (type === 'Z') {
					// 'Z' commands do not contain coordinates
				}
			});

			return {x: minX, y: minY};
		}

		m.convertForeignObjectsToText = (svg = document.querySelector('svg')) => {
			let svgDoc = svg,

				// Find all foreignObject elements
				foreignObjects = svgDoc.querySelectorAll('foreignObject')

			foreignObjects.forEach(foreignObject => {
				// Extract the text content and styles from the foreignObject
				let div = foreignObject.querySelector('p')

				// Skip if no div is found
				if (!div) {
					return;
				}

				let cleanedText = m.extractLinesFromTextNode(div.firstChild),
					textContent = cleanedText.join('\n'),
					{
						x,
						y,
						width,
						height
					} = foreignObject.getBBox(),
					textElement,
					computedStyle,
					lines


				//Make some position adjustments
				x = x + 62.5
				y += 1

				//Create a new text element
				textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');

				//Base X position
				textElement.setAttribute('x', x)

				//Base Y position
				textElement.setAttribute('y', y)

				// Copy over relevant styles
				computedStyle = getComputedStyle(div);
				/*textElement.setAttribute('font-family', computedStyle.fontFamily)
				textElement.setAttribute('font-size', computedStyle.fontSize)*/
				/*textElement.setAttribute('fill', computedStyle.color)*/

				textElement.setAttribute('class', 'textbox-inner ')
				textElement.setAttribute('text-anchor', 'middle')


				// Handle multi-line text by creating tspan elements
				lines = textContent.split('\n');
				lines.forEach((line, index) => {
					let tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
					tspan.setAttribute('x', x);
					tspan.setAttribute('dy', index === 0 ? '1em' : '1.2em'); // Adjust line height
					tspan.textContent = line;
					textElement.appendChild(tspan);
				})

				// Replace the foreignObject with the new text element
				foreignObject.parentNode.replaceChild(textElement, foreignObject)
			})

			return svgDoc
		}

		m.saveSVG = async (svg = document.querySelector('svg')) => {

			if (document.querySelector('.output svg')) {
				document.querySelector('.output svg').remove()
			}

			document.querySelector('.output').appendChild(svg.cloneNode(true))

			let svgDoc = m.convertForeignObjectsToText(document.querySelector('.output svg')),

				styles = await $.get('sys/css/styles.css'),
				styleElement = svgDoc.querySelector('style')

			styles = styles.replaceAll('../fonts/', 'https://schme16.github.io/MakerSkillTree-Generator/sys/fonts/')

			styles = styles.replaceAll('Uniform Condensed Regular', 'Uniform-Condensed6')
			styles = styles.replaceAll('UniformCondensedRegular-Regular', 'Uniform-Condensed6')
			styleElement.innerHTML += styles

			//convert inputs to svg text
			;[...svgDoc.querySelectorAll('input')].forEach(el => {
				let text = document.createElement('text')
				text.setAttribute('x', 420.95)
				text.setAttribute('y', 65)
				text.setAttribute('class', 'cls-19 header')
				text.setAttribute('text-anchor', 'middle')

				text.innerText = el.value

				svgDoc.appendChild(text)
				el.remove()
			})

			//Remove straggler html content
			;[...svgDoc.querySelectorAll('input, foreignObject, div, p, [hidden]')].forEach(el => {
				el.remove()
			})


			let fOs = [...document.querySelectorAll('.textbox-wrapper')],
				newData = JSON.parse(JSON.stringify(m.data)),
				newItems = {}

			for (let i in fOs) {
				let parentIndex = fOs[i].parentElement.getAttribute('index'),
					_index = fOs[i].getAttribute('index')

				if (!!newData.items[_index]) {
					newItems[parentIndex] = newData.items[_index]
				}
			}

			newData.items = newItems

			let jsonElement = document.createElement('json')
			jsonElement.innerHTML = btoa(encodeURIComponent(angular.toJson(newData)))


			svgDoc.prepend(jsonElement)


			let fileContent = svgDoc.outerHTML.replaceAll('&quot;', `'`),
				bb = new Blob([fileContent], {type: 'image/svg+xml'}),
				a = document.createElement('a')

			let title = (newData.title || 'Untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase().trim()
			a.download = `MakerSkillTree - ${title}.svg`
			a.href = window.URL.createObjectURL(bb)
			a.click()


			document.querySelector('.output').replaceChildren();

			return fileContent
		}

		m.loadSVG = (event) => {

			let [file] = document.querySelector("input[type=file]").files,
				reader = new FileReader()

			reader.addEventListener("load", () => {


				document.querySelector('.output').innerHTML = reader.result

				let raw = document.querySelector('.output json')

				let json
				try {
					json = JSON.parse(decodeURIComponent(atob(raw.innerHTML)))
				}
				catch (e) {
					console.log("Error:", e)
				}

				let oldSVG = document.querySelector('.output svg')
				if (oldSVG) {
					oldSVG.remove()
				}

				if (json) {
					m.data = json
					if (!m.data.credits) {
						m.data.credits = 'STEPH PIPER - MAKERQUEEN AU'
					}
					document.querySelector("input[type=file]").value = '',
						fOs = [...document.querySelectorAll('.textbox-wrapper')]

					for (let i in fOs) {
						let _index = fOs[i].getAttribute('index')
						document.querySelector(`svg:not(.output svg) foreignObject[index="${_index}"]`).appendChild(fOs[i])
					}

					m.$applyAsync()
				}

			}, false)

			if (file) {
				reader.readAsText(file);
			}

		}

		m.createEditableForeignObject = (scope, $compile, ngModel, placeholder) => {
			let fO = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject'),
				out = $compile(`<input placeholder="${placeholder}" ng-model="${ngModel}">`)(scope)[0]


			fO.setAttribute('x', 0)
			fO.setAttribute('y', 0)
			fO.setAttribute('width', 0)
			fO.setAttribute('height', 0)


			fO.appendChild(out)
			return fO
		}

		m.createEditableTitle = (svg, scope, compile) => {
			let fO = m.createEditableForeignObject(scope, compile, 'data.title', 'Enter a title...')

			fO.setAttribute('x', 0)
			fO.setAttribute('y', -4)
			fO.setAttribute('width', 841.89)
			fO.setAttribute('height', 78)
			fO.setAttribute('class', 'header')


			svg.appendChild(fO)
			return fO
		}

		m.createEditableName = (svg, scope, compile) => {
			let fO = m.createEditableForeignObject(scope, compile, 'data.name', 'Enter your name...')

			fO.setAttribute('x', 125)
			fO.setAttribute('y', 1114)
			fO.setAttribute('width', 213)
			fO.setAttribute('height', 24)

			svg.appendChild(fO)
			return fO
		}

		m.extractLinesFromTextNode = (textNode) => {

			if (textNode.nodeType !== 3) {
				throw (new Error("Lines can only be extracted from text nodes."));
			}

			// BECAUSE SAFARI: None of the "modern" browsers seem to care about the actual
			// layout of the underlying markup. However, Safari seems to create range
			// rectangles based on the physical structure of the markup (even when it
			// makes no difference in the rendering of the text). As such, let's rewrite
			// the text content of the node to REMOVE SUPERFLUOS WHITE-SPACE. This will
			// allow Safari's .getClientRects() to work like the other modern browsers.
			textNode.textContent = m.collapseWhiteSpace(textNode.textContent);

			// A Range represents a fragment of the document which contains nodes and
			// parts of text nodes. One thing that's really cool about a Range is that we
			// can access the bounding boxes that contain the contents of the Range. By
			// incrementally adding characters - from our text node - into the range, and
			// then looking at the Range's client rectangles, we can determine which
			// characters belong in which rendered line.
			let textContent = textNode.textContent,
				range = document.createRange(),
				lines = [],
				lineCharacters = []

			// Iterate over every character in the text node.
			for (let i = 0; i < textContent.length; i++) {

				// Set the range to span from the beginning of the text node up to and
				// including the current character (offset).
				range.setStart(textNode, 0);
				range.setEnd(textNode, (i + 1));

				// At this point, the Range's client rectangles will include a rectangle
				// for each visually-rendered line of text. Which means, the last
				// character in our Range (the current character in our for-loop) will be
				// the last character in the last line of text (in our Range). As such, we
				// can use the current rectangle count to determine the line of text.
				var lineIndex = (range.getClientRects().length - 1);

				// If this is the first character in this line, create a new buffer for
				// this line.
				if (!lines[lineIndex]) {

					lines.push(lineCharacters = []);

				}

				// Add this character to the currently pending line of text.
				lineCharacters.push(textContent.charAt(i));

			}

			// At this point, we have an array (lines) of arrays (characters). Let's
			// collapse the character buffers down into a single text value.
			lines = lines.map((characters) => {

				return (m.collapseWhiteSpace(characters.join("")));

			})

			for (let i in lines) {
				if (!lines[i]) {
					lines.splice(i, 1)
				}
			}

			return (lines);

		}


		/**
		 * I normalize the white-space in the given value such that the amount of white-
		 * space matches the rendered white-space (browsers collapse strings of white-space
		 * down to single space character, visually, and this is just updating the text to
		 * match that behavior).
		 */
		m.collapseWhiteSpace = (value) => {
			if (value == '\n') {
				value = null
			}
			return value;//(value.trim().replace(/\s+/g, " "));

		}


		window.addEventListener('keydown', (e) => {
			if (e.key == 's' && e.ctrlKey) {
				e.preventDefault()
				m.saveSVG()
			}
		})
	})

	/*Turns off the ng-scope, et al. debug classes*/
	.config([
		'$compileProvider', ($compileProvider) => {
			$compileProvider.debugInfoEnabled(false)
		}
	])

	.directive('skillTreeWrapper', ($compile) => {
		return {
			restrict: 'C',
			scope: true,
			link: async (scope, element, attrs) => {

				let svg = element.find('svg')[0],
					hexagonalQuerySelector = `.cls-12:not([d="M 208.2 236.93 176.95 199.6 208.2 162.26 270.72 162.26 301.98 199.6 270.72 236.93 208.2 236.93z"]):not([d="M 104.3 278.54 73.04 241.2 104.3 203.87 166.81 203.87 198.07 241.2 166.81 278.54 104.3 278.54z"]):not([d="M 414.37 237.55 383.12 200.21 414.37 162.88 476.89 162.88 508.14 200.21 476.89 237.55 414.37 237.55z"]):not([d="M 620.54 237.8 589.28 200.46 620.54 163.13 683.05 163.13 714.31 200.46 683.05 237.8 620.54 237.8z"]):not([d="M 722.8 280.01 691.54 242.68 722.8 205.34 785.32 205.34 816.57 242.68 785.32 280.01 722.8 280.01z"])`

				m.hexagonals = {}

				//Convert the hexagonals to paths
				let polys = [...document.querySelectorAll(hexagonalQuerySelector)];
				polys.forEach((poly) => {
					let id = `${(Math.random() * 100000).toFixed(0)}_${(Math.random() * 100000).toFixed(0)}_${(Math.random() * 100000).toFixed(0)}_${(Math.random() * 100000).toFixed(0)}`
					poly.id = id
					m.convertPolyToPath(poly)
				})

				//Convert the hexagonals to paths
				let paths = [...document.querySelectorAll(hexagonalQuerySelector)],
					_index = 0,
					createTextBox = (x, y, text, index) => {
						let textbox = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject'),
							textboxWrapper = document.createElement('div'),
							textboxInner = document.createElement('p'),
							textboxLeftAngles = document.createElement('div'),
							textboxRightAngles = document.createElement('div')


						textboxLeftAngles.classList.add('left-wrapper')
						textboxRightAngles.classList.add('right-wrapper')

						textbox.classList.add('textbox')
						textbox.setAttribute('x', x)
						textbox.setAttribute('y', y)
						textbox.setAttribute('width', 148)
						textbox.setAttribute('height', 88)
						textbox.setAttribute('index', _index)
						_index++

						//buildTip(textbox)


						textboxWrapper.classList.add('textbox-wrapper')
						textboxWrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
						textboxWrapper.setAttribute('index', index)
						textboxWrapper.appendChild(textboxLeftAngles)
						textboxWrapper.appendChild(textboxRightAngles)

						textboxInner.classList.add('textbox-inner')
						textboxInner.innerText = text

						let out = $compile(textboxInner.outerHTML.replace(`></`, `>{{data.items[index]}}</`), null, 1)(scope)[0]

						textboxWrapper.appendChild(out)
						textbox.appendChild(textboxWrapper)

						return {textbox, textboxWrapper, textboxInner}
					},
					index = 0


				paths.forEach((path) => {
					let pos = m.getTopLeftPointOfPath(path),
						{
							textbox,
							textboxInner
						} = createTextBox(pos.x, pos.y, ``, index)

					index++

					svg.appendChild(textbox)

				})

				element.find('.cls-16').on('click', () => {
					window.open('https://github.com/sjpiper145/MakerSkillTree', '_blank').focus();
				})

				element.find('.cls-11').on('click', () => {
					window.open('https://icons8.com', '_blank').focus();
				})

				m.sortHexagonals = new Draggable.Swappable(document.querySelectorAll('foreignObject'), {
					draggable: '.textbox-wrapper',
					//handle: '.board-column:not(.board-column-add-new-column) :not(.note-locked) .board-column-note-title',
					mirror: {
						appendTo: document.body,
						constrainDimensions: true,
					},
				})

				m.sortHexagonals.on('drag:stop', (a, b, c) => {
					/*setTimeout(() => {

						let fOs = [...document.querySelectorAll('.textbox-wrapper')];

						let old = {}
						for (let i in fOs) {
							let parentIndex = fOs[i].parentElement.getAttribute('index'),
								index = fOs[i].getAttribute('index')

							if (parentIndex != index) {

								old[parentIndex] = m.data.items[parentIndex]
								
								m.data.items[parentIndex] = m.data.items[index]
								
								m.data.items[index] = old[parentIndex]

								fOs[i].setAttribute('index', parentIndex)


							}
							else {
							}
						}

						m.$applyAsync()

					}, 250)*/
				})

				let startX, startY;


				scope.creditsTip = tippy(document.querySelector('#credits'), {
					trigger: 'click',
					triggerTarget: document.querySelector('#credits'),
					appendTo: document.body,
					interactive: true,
					interactiveBorder: 10,
					interactiveDebounce: 16,
					//sticky: 'popper',

					allowHTML: true,
					placement: 'bottom',
					theme: 'light',
					content: $compile(await $.get(`sys/popups/edit-credits.html`), null, 1)(scope)[0],
				})

				let credits = document.querySelector('#credits')

				function scaleSVGText(svgTextElement) {
					// Define the constraints
					const maxWidth = 570;
					const minFontSize = 11;
					const maxFontSize = 16;

					// Create a temporary SVG text element to measure the text width
					const tempSVG = document.querySelector('#credits_test'),
						svgDoc = document.querySelector('svg:not(.output svg)')


					// Function to get the text width for a given font size
					function getTextWidth(fontSize) {
						tempSVG.setAttribute("style", `font-size: ${fontSize}px !important`);

						tempSVG.removeAttribute("hidden")

						// Force reflow to ensure the element is rendered and the bounding box is accurate
						svgDoc.removeChild(tempSVG);
						svgDoc.appendChild(tempSVG);

						const width = tempSVG.getBoundingClientRect().width;

						console.log(width)

						tempSVG.setAttribute("hidden", 'hidden')
						return width;
					}

					// Binary search to find the optimal font size
					let low = minFontSize;
					let high = maxFontSize;
					let optimalFontSize = minFontSize;

					while (low <= high) {
						const mid = Math.floor((low + high) / 2);
						const width = getTextWidth(mid);
						if (width <= maxWidth) {
							optimalFontSize = mid;
							low = mid + 1;
						}
						else {
							high = mid - 1;
						}
					}

					console.log(optimalFontSize)
					// Set the optimal font size to the SVG text element
					svgTextElement.setAttribute("style", `font-size: ${optimalFontSize}px !important`);
				}

				m.$watch('data.credits', () => {
					setTimeout(() => {
						scaleSVGText(credits)
					}, 100)
				}, true)

				//m.createEditableName(svg, scope, $compile)
				m.createEditableTitle(svg, scope, $compile)
			}
		}
	})

	.directive('textboxInner', ($compile) => {
		let index = 0
		return {
			restrict: 'C',
			scope: true,
			link: (scope, element, attrs) => {
				scope.index = index
				//element[0].//.setAttribute('index', index)
				//element[0].parent().parent()[0].setAttribute('index', index)

				index++

				buildTip = async (element) => {
					let content = $compile(await $.get(`sys/popups/edit-text.html`), null, 1)(scope)[0]

					if (scope.tip) {
						scope.tip.destroy()
					}

					scope.tip = tippy(element, {
						trigger: 'contextmenu',
						triggerTarget: element,
						appendTo: document.body,
						interactive: true,
						interactiveBorder: 10,
						interactiveDebounce: 16,
						//sticky: 'popper',

						allowHTML: true,
						placement: 'bottom',
						theme: 'light',
						content: content,
						onShow: () => {
							/*let input = scope.tip.popper.querySelector('input,textarea')

							if (input) {
								setTimeout(() => {

									input.focus()
									input.addEventListener('keydown', (event) => {
										if (event.key === 'Enter') {
											scope.tip.hide()
										}
									}, false)
								}, 200)
							}*/

							m.$applyAsync()

						},
						onHide: () => {
							/*if (rebuild) {
								rebuild = false
								buildTip(content)
							}

							m.$root.popupID = null
							button.popupID = null
							m.$applyAsync()*/

						}
					})

					window.tip = scope.tip

					element.addEventListener('contextmenu', (e) => {
						e.preventDefault()
					})
				}

				buildTip(element[0])
			}

		}
	})

/*Sample directive*/
/*.directive('sampleDirective', () => {
	return {
		restrict: 'A',
		scope: true,
		link: (scope, element, attrs) => {
		
		}
	}
})*/