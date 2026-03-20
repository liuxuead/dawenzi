// 游戏状态
const gameState = {
    power: 60,
    isCharging: false,
    activeButton: null,
    mosquitoes: [],
    cannonAngle: -90
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
const gameOverModal = document.getElementById('gameOverModal');
const restartBtn = document.getElementById('restartBtn');
const zapperSound = document.getElementById('zapperSound');
const meizidanSound = document.getElementById('meizidanSound');
const trailSvg = document.getElementById('trailSvg');

// 初始化
function init() {
    console.log('Game init started');
    initCanvas();
    updatePowerBar();
    spawnMosquitoes();
    startMosquitoMovement();
    bindEvents();
    console.log('Game init completed');
}

// 初始化画布
function initCanvas() {
    // SVG不需要初始化尺寸，它自动适应父容器
    console.log('Canvas initialized');
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
        
        // 1号蚊子使用图片，不显示黑球背景
        if (i === 0) {
            mosquito.classList.add('mosquito-image-only');
        }
        
        mosquito.style.left = Math.random() * 80 + 10 + '%';
        mosquito.style.top = Math.random() * 60 + 10 + '%';
        
        // 添加编号或图片
        if (i === 0) {
            // 编号1使用图片
            const img = document.createElement('img');
            img.className = 'mosquito-image';
            img.src = 'wenzi1.png';
            img.alt = '蚊子1';
            mosquito.appendChild(img);
        } else {
            // 其他编号使用文字
            const number = document.createElement('div');
            number.className = 'mosquito-number';
            number.textContent = i + 1;
            mosquito.appendChild(number);
        }
        
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

// 点击时间记录
let lastClickTime = 0;

// 绑定事件
function bindEvents() {
    // 红色按钮 - 发射
    btnRed.addEventListener('click', () => {
        setActiveButton('red');
        fire();
    });
    
    // 绿色按钮 - 充电/蓄力（根据点击速度调整充电速度）
    btnGreen.addEventListener('click', () => {
        setActiveButton('green');
        const currentTime = Date.now();
        const clickInterval = currentTime - lastClickTime;
        lastClickTime = currentTime;
        
        // 根据点击间隔调整充电量：点击越快，充电越多
        let chargeAmount = 5; // 默认充电量
        if (clickInterval < 300) chargeAmount = 15; // 快速点击
        else if (clickInterval < 600) chargeAmount = 10; // 中等速度点击
        
        gameState.power = Math.min(gameState.power + chargeAmount, 100);
        updatePowerBar();
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
    
    // 限制角度范围：垂直方向(-90度)左右各60度
    // 向左最大：-90 - 60 = -150度
    // 向右最大：-90 + 60 = -30度
    if (gameState.cannonAngle < -150) gameState.cannonAngle = -150;
    if (gameState.cannonAngle > -30) gameState.cannonAngle = -30;
    
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
}



// 发射
function fire() {
    if (gameState.power < 10) {
        meizidanSound.currentTime = 0;
        meizidanSound.play();
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
    
    // 创建炮弹
    createBullet();
}

// 创建炮弹
function createBullet() {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    
    // 获取游戏区域的位置和尺寸
    const gameAreaRect = gameArea.getBoundingClientRect();
    
    // 计算炮口位置（炮筒末端）
    const angleRad = gameState.cannonAngle * Math.PI / 180;
    const cannonLength = cannonBarrel.offsetWidth;
    
    // 炮筒旋转中心（根据CSS计算）
    // left: 50%, margin-left: -5px
    const pivotX = gameAreaRect.width / 2 - 5;
    // 炮筒在游戏区域下方，需要获取炮筒相对于游戏区域的实际位置
    const cannonRect = cannonBarrel.getBoundingClientRect();
    // 炮筒旋转中心是CSS中的transform-origin: left center
    // 也就是炮筒的左端中心点
    const pivotY = cannonRect.top + cannonRect.height / 2 - gameAreaRect.top;
    
    // 炮口位置（右端点，根据角度计算）
    const startX = pivotX + Math.cos(angleRad) * cannonLength;
    const startY = pivotY + Math.sin(angleRad) * cannonLength;
    
    console.log('pivotY:', pivotY, 'gameAreaRect.top:', gameAreaRect.top, 'gameAreaRect.height:', gameAreaRect.height);
    console.log('cannonRect.top:', cannonRect.top, 'cannonRect.height:', cannonRect.height);
    
    // 设置炮弹初始位置（居中）
    bullet.style.left = (startX - 7.5) + 'px';
    bullet.style.top = (startY - 7.5) + 'px';
    
    gameArea.appendChild(bullet);
    
    // 计算飞行方向
    const speed = 15;
    const vx = Math.cos(angleRad) * speed;
    const vy = Math.sin(angleRad) * speed;
    
    // 炮弹飞行
    let bulletX = startX - 7.5;
    let bulletY = startY - 7.5;
    
    // 创建SVG轨迹线
    console.log('Creating trail line, start:', startX, startY);
    const trailLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    trailLine.setAttribute('stroke', '#FF0000');
    trailLine.setAttribute('stroke-width', '5');
    trailLine.setAttribute('fill', 'none');
    trailLine.setAttribute('stroke-linecap', 'round');
    trailLine.setAttribute('stroke-linejoin', 'round');
    const points = [`${startX},${startY}`];
    trailLine.setAttribute('points', points.join(' '));
    trailSvg.appendChild(trailLine);
    console.log('Trail line added to SVG');
    
    const flyInterval = setInterval(() => {
        bulletX += vx;
        bulletY += vy;
        
        bullet.style.left = bulletX + 'px';
        bullet.style.top = bulletY + 'px';
        
        // 添加轨迹点
        points.push(`${bulletX + 7.5},${bulletY + 7.5}`);
        trailLine.setAttribute('points', points.join(' '));
        
        // 检测是否击中蚊子
        const bulletRect = bullet.getBoundingClientRect();
        let hit = false;
        let hitMosquito = null;
        
        gameState.mosquitoes.forEach(m => {
            const mosquitoRect = m.element.getBoundingClientRect();
            
            // 简单的碰撞检测
            if (bulletRect.left < mosquitoRect.right &&
                bulletRect.right > mosquitoRect.left &&
                bulletRect.top < mosquitoRect.bottom &&
                bulletRect.bottom > mosquitoRect.top) {
                
                // 击中蚊子
                m.element.style.transform = 'scale(1.5)';
                m.element.style.opacity = '0';
                hit = true;
                hitMosquito = m;
                
                // 播放电击音效
                zapperSound.currentTime = 0;
                zapperSound.play();
            }
        });
        
        // 如果击中蚊子，移除该蚊子
        if (hitMosquito) {
            setTimeout(() => {
                hitMosquito.element.remove();
                const index = gameState.mosquitoes.indexOf(hitMosquito);
                if (index > -1) {
                    gameState.mosquitoes.splice(index, 1);
                }
                updateRadarDots();
                
                // 检查是否所有蚊子都被消灭
                if (gameState.mosquitoes.length === 0) {
                    showGameOver();
                }
            }, 500);
            updateRadarDots();
        }
        
        // 检测是否超出屏幕
        if (bulletX < -20 || bulletX > gameAreaRect.width + 20 ||
            bulletY < -20 || bulletY > gameAreaRect.height + 20 || hit) {
            clearInterval(flyInterval);
            bullet.remove();
            
            // 延迟清除轨迹
            setTimeout(() => {
                trailLine.remove();
            }, 300);
        }
    }, 20);
}

// 显示游戏结束弹窗
function showGameOver() {
    gameOverModal.style.display = 'flex';
}

// 重新开始游戏
function restartGame() {
    gameOverModal.style.display = 'none';
    gameState.power = 60;
    gameState.cannonAngle = -90;
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
    updatePowerBar();
    spawnMosquitoes();
    
    // 清除所有轨迹线
    while (trailSvg.firstChild) {
        trailSvg.removeChild(trailSvg.firstChild);
    }
}

// 绑定重新开始按钮事件
restartBtn.addEventListener('click', restartGame);

// 窗口大小改变时重新初始化画布
window.addEventListener('resize', () => {
    initCanvas();
});

// 启动游戏
window.addEventListener('load', () => {
    setTimeout(() => {
        init();
    }, 100);
});
