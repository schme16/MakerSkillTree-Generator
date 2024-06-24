angular.module('Maker Skill Tree', [])

	/*The master controller*/
	.controller('master', ($scope, $sce) => {
		m = $scope

		m.data = {
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
				let div = foreignObject.querySelector('div')

				// Skip if no div is found
				if (!div) {
					return;
				}

				let textContent = div.textContent.trim(),
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
				textElement.setAttribute('font-family', computedStyle.fontFamily)
				textElement.setAttribute('font-size', computedStyle.fontSize)
				textElement.setAttribute('text-anchor', 'middle')
				textElement.setAttribute('fill', computedStyle.color)

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

			styleElement.innerHTML += styles

			;[...svgDoc.querySelectorAll('input, foreignObject, div, p')].forEach(el => {
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
			jsonElement.innerHTML = btoa(angular.toJson(newData))

			svgDoc.prepend(jsonElement)


			let fileContent = svgDoc.outerHTML,
				bb = new Blob([fileContent], {type: 'image/svg+xml'}),
				a = document.createElement('a')

			let title = (newData.title || 'Untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase().trim()
			a.download = `MakerSkillTree - ${title}.svg`
			a.href = window.URL.createObjectURL(bb)
			a.click()


			document.querySelector('.output').replaceChildren();
			return svgDoc.outerHTML
		}

		m.loadSVG = (event) => {

			let [file] = document.querySelector("input[type=file]").files,
				reader = new FileReader()

			reader.addEventListener("load", () => {


				document.querySelector('.output').innerHTML = reader.result

				let raw = document.querySelector('.output json')

				let json
				try {
					json = JSON.parse(atob(raw.innerHTML))
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

		m.createEditableName = (svg, scope, compile) => {
			let fO = m.createEditableForeignObject(scope, compile, 'data.title', 'Enter a title...')

			fO.setAttribute('x', 100)
			fO.setAttribute('y', 52)
			fO.setAttribute('width', 707)
			fO.setAttribute('height', 24)


			svg.appendChild(fO)
			return fO
		}

		m.createEditableTitle = (svg, scope, compile) => {
			let fO = m.createEditableForeignObject(scope, compile, 'data.name', 'Enter your name...')

			fO.setAttribute('x', 125)
			fO.setAttribute('y', 1114)
			fO.setAttribute('width', 213)
			fO.setAttribute('height', 24)

			svg.appendChild(fO)
			return fO
		}

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
			link: (scope, element, attrs) => {

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

								console.log(1111)

							}
							else {
								//console.log(2222)
							}
						}

						m.$applyAsync()

					}, 250)*/
				})

				let startX, startY;

				m.createEditableName(svg, scope, $compile)
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
						placement: 'auto-start',
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