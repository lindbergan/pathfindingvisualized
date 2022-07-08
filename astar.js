const gridEl = document.getElementById("grid")
const grid = []

const DEFAULTS = {
  width: 8,
  height: 8,
  startPos: { x: 0, y: 0 },
  endPos: { x: 7, y: 5 },
  obstacles: [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 7, y: 4 },
  ],
  showCost: false
}

let startPos = DEFAULTS.startPos
let endPos = DEFAULTS.endPos
let width = DEFAULTS.width, height = DEFAULTS.height
let obstacles = DEFAULTS.obstacles
let showCost = DEFAULTS.showCost

let isHoldingShift = false
let isHoldingAlt = false

const setInputValue = (name, value) => {
  const input = document.querySelector(`#info input[name=${name}]`)

  input.setAttribute("value", value)
}

const changeInfoPosText = (id, pos) => {
  const div = document.querySelector(`#info div[id=${id}]`)
  const [ xSpan, ySpan ] = Array.of(...div.children)

  xSpan.textContent = pos.x
  ySpan.textContent = pos.y
}

const handleCellClick = (event) => {
  const pos = {
    x: parseInt(event.target.getAttribute("x")),
    y: parseInt(event.target.getAttribute("y")),
  }

  if (isHoldingShift) {
    const obstacleIndex = obstacles.findIndex(ob => eqPos(ob, pos))
    if (obstacleIndex !== -1) {
      obstacles.splice(obstacleIndex, 1)
    } else {
      obstacles.push(pos)
    }
  }
  else {
    if (isHoldingAlt) {
      endPos = pos
      changeInfoPosText("end", endPos)
    } else {
      startPos = pos
      changeInfoPosText("start", startPos)
    }
  }
  redraw()
}

const clearGrid = () => {
  const children = Array.of(...gridEl.children)
  children.forEach(child => gridEl.removeChild(child))

  grid.children = []
}

const createGrid = () => {
  for (let w = 0; w < width; w++) {
    const rowEl = document.createElement("div")
    rowEl.classList.add("row")

    const row = []
    
    for (let h = 0; h < height; h++) {
      const cellEl = document.createElement("span")
      
      cellEl.classList.add("cell")
      cellEl.setAttribute("x", w)
      cellEl.setAttribute("y", h)
      rowEl.appendChild(cellEl)

      cellEl.addEventListener("mousedown", handleCellClick)

      const cell = { x: w, y: h }
      row.push(cell)
    }

    grid.push(row)
    gridEl.appendChild(rowEl)
  }
}

const markCell = ({ x, y }, cellType, remove) => {
  const row = gridEl.children[x]
  const cell = row.children[y]

  if (remove) {
    const classes = Array.of(...cell.classList)
    classes.forEach(aClass => cell.classList.remove(aClass))
    cell.classList.add("cell")
  }
  
  cell.classList.add(cellType)
}

const unmarkCell = ({ x, y }, cellType) => {
  const row = gridEl.children[x]
  const cell = row.children[y]

  
  cell.classList.remove(cellType)
}

const placeCost = (pos, gCost, hCost, fCost) => {
  if (!showCost) return

  const { x, y } = pos
  const row = gridEl.children[x]
  const cell = row.children[y]

  const children = Array.of(...cell.children)
  children.forEach(child => cell.removeChild(child))
  
  const costContainer = document.createElement("div")
  costContainer.classList.add("cost-container")

  const fCostEl = document.createElement("div")
  fCostEl.classList.add("f-cost")
  fCostEl.textContent = fCost.toFixed(0)

  const gCostAndHCost = document.createElement("div")
  gCostAndHCost.classList.add("g-and-h-cost")

  const gCostEl = document.createElement("span")
  gCostEl.classList.add("g-cost")
  gCostEl.textContent = gCost.toFixed(0)

  const hCostEl = document.createElement("span")
  hCostEl.classList.add("h-cost")
  hCostEl.textContent = hCost.toFixed(0)

  gCostAndHCost.appendChild(gCostEl)
  gCostAndHCost.appendChild(hCostEl)
  
  costContainer.appendChild(gCostAndHCost)
  costContainer.appendChild(fCostEl)

  cell.appendChild(costContainer)
}

const eqPos = ({ x: x1, y: y1 }, { x: x2, y: y2 }) => x1 === x2 && y1 === y2
const deepClone = obj => JSON.parse(JSON.stringify(obj))

/*
 * Expect that 0,0 should return 0,1 and 1,0 
 *
 */
const getNeighbours = ({ x, y }, width, height, obstacles) => {
  const neighbours = [
    { x: x, y: y - 1 },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x + 1, y: y },
  ]

  const fulfillsConstraints = (pos) => {
    const notInObstacles = () => !obstacles.find(ob => eqPos(ob, pos))

    return notInObstacles() && pos.x >= 0 && pos.y >= 0 && pos.x < width && pos.y < height
  }

  return neighbours.filter(n => fulfillsConstraints(n))
}

const retrace = (pos) => {
  const path = []
  
  let current = pos
  
  while(current !== null) {
    path.push(current.pos)
    
    current = current.parent
  }

  return path.reverse()
}
const countCost = (posA, posB) => {
  const a = Math.pow(posA.x - posB.x, 2)
  const b = Math.pow(posA.y - posB.y, 2)

  return Math.sqrt(a + b)
}

/* A-Star */
const getPath = (startPos, endPos, obstacles) => {
  const open = [], closed = []

  // Add startNode in open
  open.push({
    pos: deepClone(startPos),
    fCost: 0,
    gCost: 0,
    hCost: 0,
    parent: null
  })

  let end = null

  while(open.length > 0) {
    const current = deepClone(open.pop())
    markCell(current.pos, "current-pos")

    const neighbours = getNeighbours(current.pos, width, height, obstacles)
      .map(pos => ({
        pos,
        gCost: 99999,
        hCost: 99999,
        fCost: 9999,
        parent: deepClone(current)
      }))

    for (let n = 0; n < neighbours.length; n++) {
      const neighbour = neighbours[n]
      
      markCell(neighbour.pos, "neighbour-pos")

      if (eqPos(neighbour.pos, endPos)) {
        unmarkCell(current.pos, "current-pos")
        unmarkCell(neighbour.pos, "neighbour-pos")
        return retrace(deepClone(neighbour))
      }
      else {
        neighbour.gCost = current.gCost + countCost(neighbour.pos, current.pos)
        neighbour.hCost = countCost(neighbour.pos, endPos)
        neighbour.fCost = neighbour.gCost + neighbour.hCost

        const inOpen = pos => open.find(obj => eqPos(obj.pos, pos))
        const inClosed = pos => closed.find(obj => eqPos(obj.pos, pos))

        const inOpenPos = inOpen(neighbour.pos)
        const inClosedPos = inClosed(neighbour.pos)

        if ((inOpenPos && (inOpenPos.fCost < neighbour.fCost)) || (inClosedPos && (inClosedPos.fCost < neighbour.fCost))) {
          unmarkCell(neighbour.pos, "neighbour-pos")
          continue
        }
        else {
          placeCost(neighbour.pos, neighbour.gCost, neighbour.hCost, neighbour.fCost)
          
          if (!open.find(obj => eqPos(obj.pos, neighbour.pos))) {
            open.push(deepClone(neighbour))
            open.sort((a, b) => {
              if (a.fCost === b.fCost) return b.hCost - a.hCost
              return b.fCost - a.fCost
            })
          }
        }
      }

      unmarkCell(neighbour.pos, "neighbour-pos")
    }

    closed.push(deepClone(current))
    unmarkCell(current.pos, "current-pos")
  }

  if (end === null) {
    console.log("Did not find the path")
    return []
  }
  return retrace(end)
}

const redraw = () => {
  clearGrid()
  createGrid()

  markCell(startPos, "start-pos", true)
  markCell(endPos, "end-pos", true)
  obstacles.forEach(ob => markCell(ob, "obstacle-pos", true))

  const path = getPath(startPos, endPos, obstacles)

  path
    .filter(p => !eqPos(startPos, p))
    .filter(p => !eqPos(endPos, p))
    .forEach(p => markCell(p, "path-pos"))
}

const initGlobalListeners = () => {
  window.document.addEventListener("keydown", event => {

    switch(event.key) {
      case "Shift": {
        isHoldingShift = true
        break
      }
      case "Alt": {
        isHoldingAlt = true
        break
      }
    }
  })

  window.document.addEventListener("keyup", event => {
    switch(event.key) {
      case "Shift": {
        isHoldingShift = false
        break
      }
      case "Alt": {
        isHoldingAlt = false
        break
      }
    }
  })

  const checkbox = document.querySelector("#info input[type='checkbox']")
  checkbox.addEventListener("change", (event) => {
    showCost = event.target.checked
    redraw()
  })

  const button = document.querySelector("#clear-obstacles")
  button.addEventListener("click", () => {
    obstacles = []
    redraw()
  })

  const setInputListener = name => {
    const input = document.querySelector(`#info input[name=${name}]`)

    if (input) {
      input.addEventListener("change", (event => {

        if (name === "width") width = event.target.value
        else if (name === "height") height = event.target.value
        
        redraw()
      }))
    }
  }

  setInputListener("width")
  setInputListener("height")
}

setInputValue("width", width)
setInputValue("height", height)
setInputValue("costCheckbox", showCost)
changeInfoPosText("start", startPos)
changeInfoPosText("end", endPos)

redraw()
initGlobalListeners()