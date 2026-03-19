// 游戏状态
const gameState = {
    power: 60,
    isCharging: false,
    activeButton: null,
    mosquitoes: [],
    cannonAngle: -45
};

// DOM 元素
const powerFill = document.getElementById('powerFill');
const radar = document.getElementById('radar');
const btnRed = document.getElementById('btnRed');
const btnGreen = document.getElementById('btnGreen');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const gameArea = document.getElementById('gameArea');
const cannonBarrel = document.getElementById('cannonBarrel');

// 初始化
function init() {
    updatePowerBar();
    spawnMosquitoes();
    startMosquitoMovement();
    bindEvents();
}

// 更新电力条
function updatePowerBar() {
    powerFill.style.width = gameState.power + '%';
}

// 生成蚊子
function spawnMosquitoes() {
    const count = 5;
    gameArea.innerHTML = '';
    gameState.mosquitoes = [];
    
    for (let i = 0; i < count; i++) {
        const mosquito = document.createElement('div');
        mosquito.className = 'mosquito';
        mosquito.style.left = Math.random() * 80 + 10 + '%';
        mosquito.style.top = Math.random() * 60 + 10 + '%';
        gameArea.appendChild(mosquito);
        
        gameState.mosquitoes.push({
            element: mosquito,
            x: parseFloat(mosquito.style.left),
            y: parseFloat(mosquito.style.top),
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
        });
    }
    
    updateRadarDots();
}

// 更新雷达红点
function updateRadarDots() {
    const existingDots = radar.querySelectorAll('.radar-dot');
    existingDots.forEach(dot => dot.remove());
    
    gameState.mosquitoes.forEach(m => {
        const dot = document.createElement('div');
        dot.className = 'radar-dot';
        dot.style.left = (m.x / 100 * 80 + 10) + '%';
        dot.style.top = (m.y / 100 * 80 + 10) + '%';
        radar.appendChild(dot);
    });
}

// 蚊子移动
function startMosquitoMovement() {
    setInterval(() => {
        gameState.mosquitoes.forEach(m => {
            m.x += m.vx;
            m.y += m.vy;
            
            // 边界检测
            if (m.x < 5 || m.x > 90) m.vx *= -1;
            if (m.y < 5 || m.y > 70) m.vy *= -1;
            
            m.element.style.left = m.x + '%';
            m.element.style.top = m.y + '%';
        });
        
        updateRadarDots();
    }, 50);
}

// 绑定事件
function bindEvents() {
    // 红色按钮 - 充电/蓄力
    btnRed.addEventListener('click', () => {
        setActiveButton('red');
        startCharging();
    });
    
    // 绿色按钮 - 发射
    btnGreen.addEventListener('click', () => {
        setActiveButton('green');
        fire();
    });
    
    // 左箭头 - 炮口向左旋转（逆时针）
    btnLeft.addEventListener('click', () => {
        rotateCannon(-5);
    });
    
    // 右箭头 - 炮口向右旋转（顺时针）
    btnRight.addEventListener('click', () => {
        rotateCannon(5);
    });
}

// 设置活动按钮
function setActiveButton(color) {
    [btnRed, btnGreen].forEach(btn => btn.classList.remove('active'));
    
    if (color === 'red') btnRed.classList.add('active');
    if (color === 'green') btnGreen.classList.add('active');
    
    gameState.activeButton = color;
}

// 旋转炮口
function rotateCannon(degrees) {
    gameState.cannonAngle += degrees;
    
    // 限制角度范围 -225 到 135（每个方向可转180度）
    if (gameState.cannonAngle < -225) gameState.cannonAngle = -225;
    if (gameState.cannonAngle > 135) gameState.cannonAngle = 135;
    
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
}

// 开始充电
function startCharging() {
    if (gameState.isCharging) return;
    gameState.isCharging = true;
    
    const chargeInterval = setInterval(() => {
        if (gameState.power < 100) {
            gameState.power += 2;
            updatePowerBar();
        } else {
            clearInterval(chargeInterval);
            gameState.isCharging = false;
        }
    }, 100);
    
    // 5秒后停止充电
    setTimeout(() => {
        clearInterval(chargeInterval);
        gameState.isCharging = false;
    }, 5000);
}

// 发射
function fire() {
    if (gameState.power < 10) {
        alert('电力不足！');
        return;
    }
    
    // 消耗电力
    gameState.power = Math.max(0, gameState.power - 20);
    updatePowerBar();
    
    // 炮筒动画
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg) scale(1.2)`;
    setTimeout(() => {
        cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg) scale(1)`;
    }, 200);
    
    // 随机击中一只蚊子
    if (gameState.mosquitoes.length > 0) {
        const targetIndex = Math.floor(Math.random() * gameState.mosquitoes.length);
        const target = gameState.mosquitoes[targetIndex];
        
        // 蚊子被击中效果
        target.element.style.transform = 'scale(1.5)';
        target.element.style.opacity = '0';
        updateRadarDots();
        
        setTimeout(() => {
            // 重新生成蚊子
            target.x = Math.random() * 80 + 10;
            target.y = Math.random() * 60 + 10;
            target.element.style.left = target.x + '%';
            target.element.style.top = target.y + '%';
            target.element.style.transform = 'scale(1)';
            target.element.style.opacity = '1';
            updateRadarDots();
        }, 500);
    }
}

// 启动游戏
init();
