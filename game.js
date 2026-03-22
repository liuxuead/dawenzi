// 游戏状态
const gameState = {
    power: 50,
    maxPower: 50,
    isCharging: false,
    activeButton: null,
    mosquitoes: [],
    cannonAngle: -90,
    playerHealth: 100,
    maxPlayerHealth: 100,
    level: 1,
    score: 0,
    highScore: parseInt(localStorage.getItem('highScore')) || 0,
    powerTimer: null
};

// 蚊子分数配置
const mosquitoScores = {
    1: 20,
    2: 50,
    3: 40,
    4: 10,
    5: 10
};

// DOM 元素
const powerFill = document.getElementById('powerFill');
const playerHealthFill = document.getElementById('playerHealthFill');
const levelValue = document.getElementById('levelValue');
const scoreValue = document.getElementById('scoreValue');
const highScoreValue = document.getElementById('highScoreValue');
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
const bgmSound = document.getElementById('bgmSound');
const trailSvg = document.getElementById('trailSvg');
const missileIcon = document.getElementById('missileIcon');

// 开始电力自动增长
function startPowerCharging() {
    if (gameState.powerTimer) {
        clearInterval(gameState.powerTimer);
    }
    
    gameState.powerTimer = setInterval(() => {
        if (gameState.power < gameState.maxPower) {
            const chargeAmount = gameState.maxPower * 0.05;
            gameState.power = Math.min(gameState.power + chargeAmount, gameState.maxPower);
            updatePowerBar();
        }
    }, 1000);
}

// 初始化
function init() {
    console.log('Game init started');
    initCanvas();
    updateBackground();
    updatePowerBar();
    updatePlayerHealth();
    updateLevel();
    updateScore();
    spawnMosquitoes();
    startMosquitoMovement();
    bindEvents();
    initBGM();
    startPowerCharging();
    console.log('Game init completed');
}

// 更新玩家血条
function updatePlayerHealth() {
    if (playerHealthFill) {
        playerHealthFill.style.width = (gameState.playerHealth / gameState.maxPlayerHealth * 100) + '%';
    }
}

// 更新等级显示
function updateLevel() {
    if (levelValue) {
        levelValue.textContent = gameState.level;
    }
}

// 更新背景图片
function updateBackground() {
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
        // 当轮如果没有背景图片，就默认用第一轮的
        let bgImage = `background${gameState.level}.jpg`;
        
        // 创建临时图片对象来检测文件是否存在
        const img = new Image();
        img.onload = function() {
            // 图片存在，使用当前轮次的背景
            gameArea.style.backgroundImage = `url('${bgImage}')`;
        };
        img.onerror = function() {
            // 图片不存在，使用第一轮的背景
            bgImage = 'background1.jpg';
            gameArea.style.backgroundImage = `url('${bgImage}')`;
        };
        img.src = bgImage;
    }
}

// 更新分数显示
function updateScore() {
    if (scoreValue) {
        scoreValue.textContent = gameState.score;
    }
    if (highScoreValue) {
        highScoreValue.textContent = gameState.highScore;
    }
}

// 添加分数
function addScore(mosquitoId) {
    const points = mosquitoScores[mosquitoId] || 10;
    gameState.score += points;
    updateScore();
}

// 保存最高分数
function saveHighScore() {
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
        updateScore();
    }
}

// 初始化背景音乐
function initBGM() {
    bgmSound.volume = 0.3; // 设置音量适中
    bgmSound.play().catch(e => {
        // 自动播放被阻止，等待用户交互后再播放
        console.log('BGM autoplay blocked, waiting for user interaction');
    });
}

// 初始化画布
function initCanvas() {
    // SVG不需要初始化尺寸，它自动适应父容器
    console.log('Canvas initialized');
}

// 更新电力条
function updatePowerBar() {
    if (powerFill) {
        powerFill.style.width = (gameState.power / gameState.maxPower * 100) + '%';
    }
    
    // 电力满格时显示飞弹图标，否则隐藏
    if (missileIcon) {
        if (gameState.power >= gameState.maxPower) {
            missileIcon.classList.add('visible');
        } else {
            missileIcon.classList.remove('visible');
        }
    }
}

// 轮次配置
const levelConfigs = {
    1: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },      // 第1轮：各1只
    2: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1 },      // 第2轮：1号×2
    3: { 1: 2, 2: 2, 3: 1, 4: 1, 5: 1 },      // 第3轮：1号×2, 2号×2
    4: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1 },      // 第4轮：1号×2, 2号×2, 3号×2
    5: { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 },      // 第5轮：全能力
    6: { 1: 3, 2: 3, 3: 2, 4: 2, 5: 2 },      // 第6轮：更多
    7: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 2 },      // 第7轮：极限
    8: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3 },      // 第8轮：地狱
};

// 创建单个蚊子
function createMosquito(mosquitoId) {
    const mosquito = document.createElement('div');
    mosquito.className = 'mosquito mosquito-image-only';
    mosquito.style.left = Math.random() * 80 + 10 + '%';
    mosquito.style.top = Math.random() * 60 + 10 + '%';
    
    const img = document.createElement('img');
    img.className = 'mosquito-image';
    img.src = `wenzi${mosquitoId}.png`;
    img.alt = `蚊子${mosquitoId}`;
    mosquito.appendChild(img);
    
    gameArea.appendChild(mosquito);
    
    let mosquitoData = {
        element: mosquito,
        id: mosquitoId,
        x: parseFloat(mosquito.style.left),
        y: parseFloat(mosquito.style.top),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        properties: {
            speed: 1,
            clone: false,
            health: false,
            heal: false
        }
    };
    
    switch (mosquitoId) {
        case 1:
            mosquitoData.properties.speed = 6;
            mosquitoData.properties.attack = true;
            mosquitoData.properties.attackInterval = 15000;
            mosquitoData.properties.lastAttackTime = 0;
            mosquitoData.vx *= 6;
            mosquitoData.vy *= 6;
            break;
        case 2:
            mosquitoData.properties.clone = true;
            mosquitoData.properties.hasCloned = false;
            mosquitoData.properties.cloneInterval = 2000;
            mosquito.style.transform = 'scale(2)';
            break;
        case 3:
            mosquitoData.properties.health = true;
            mosquitoData.properties.maxHealth = 100;
            mosquitoData.properties.currentHealth = 100;
            mosquitoData.properties.attack = true;
            mosquitoData.properties.attackInterval = 10000;
            mosquitoData.properties.lastAttackTime = 0;
            addHealthBar(mosquito, 100);
            break;
        case 4:
            mosquitoData.properties.heal = true;
            mosquitoData.properties.healInterval = 2000;
            mosquito.style.transform = 'scale(1.5)';
            break;
        case 5:
            break;
    }
    
    return mosquitoData;
}

// 生成蚊子
function spawnMosquitoes() {
    gameArea.innerHTML = '';
    gameState.mosquitoes = [];
    
    // 获取当前轮次的配置，如果没有则使用第8轮配置
    const config = levelConfigs[gameState.level] || levelConfigs[8];
    
    // 根据配置生成蚊子
    for (let mosquitoId = 1; mosquitoId <= 5; mosquitoId++) {
        const count = config[mosquitoId] || 0;
        for (let i = 0; i < count; i++) {
            const mosquitoData = createMosquito(mosquitoId);
            gameState.mosquitoes.push(mosquitoData);
        }
    }
    
    updateRadarDots();
    startMosquitoAbilities();
}

// 添加血条UI
function addHealthBar(mosquito, health) {
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    healthBar.innerHTML = `<div class="health-fill" style="width: ${health}%"></div>`;
    mosquito.appendChild(healthBar);
}

// 更新雷达红点
function updateRadarDots() {
    const existingDots = radar.querySelectorAll('.radar-dot');
    existingDots.forEach(dot => dot.remove());
    
    // 只显示活着的蚊子
    gameState.mosquitoes.forEach(m => {
        // 跳过已消失或已移除的蚊子
        if (m.element.style.opacity === '0' || !m.element.parentNode) return;
        
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
            // 跳过已消失的蚊子
            if (m.element.style.opacity === '0') return;
            
            m.x += m.vx;
            m.y += m.vy;
            
            // 边界检测，确保蚊子在可见范围内
            if (m.x < 5) {
                m.x = 5;
                m.vx *= -1;
            }
            if (m.x > 90) {
                m.x = 90;
                m.vx *= -1;
            }
            if (m.y < 5) {
                m.y = 5;
                m.vy *= -1;
            }
            if (m.y > 70) {
                m.y = 70;
                m.vy *= -1;
            }
            
            m.element.style.left = m.x + '%';
            m.element.style.top = m.y + '%';
        });
        
        updateRadarDots();
    }, 50);
}

// 启动蚊子能力系统
function startMosquitoAbilities() {
    // 2号蚊子：分身能力（出场5秒后分身一次）
    setTimeout(() => {
        gameState.mosquitoes.forEach(m => {
            // 检查是否是原始2号蚊子（有分身属性）且还未分身
            if (m.properties.clone && !m.properties.hasCloned && m.element.style.opacity !== '0') {
                cloneMosquito(m);
                m.properties.hasCloned = true; // 标记已分身
            }
        });
    }, 5000);
    
    // 4号蚊子：加血能力（每10秒检测并补满3号蚊子血量）
    setInterval(() => {
        gameState.mosquitoes.forEach(m => {
            if (m.properties.heal && m.id === 4 && m.element.style.opacity !== '0') {
                healMosquito(m);
            }
        });
    }, 10000);
    
    // 蚊子攻击能力（根据攻击间隔发射攻击子弹）
    setInterval(() => {
        const now = Date.now();
        gameState.mosquitoes.forEach(m => {
            if (m.properties.attack && m.element.style.opacity !== '0') {
                if (now - (m.properties.lastAttackTime || 0) >= m.properties.attackInterval) {
                    mosquitoAttack(m);
                    m.properties.lastAttackTime = now;
                }
            }
        });
    }, 1000);
    
    // 玩家血量自动回复（每秒回复2点）
    setInterval(() => {
        if (gameState.playerHealth < gameState.maxPlayerHealth) {
            gameState.playerHealth = Math.min(gameState.playerHealth + 2, gameState.maxPlayerHealth);
            updatePlayerHealth();
        }
    }, 1000);
}

// 克隆蚊子（2号蚊子分身，可以分任何蚊子）
function cloneMosquito(cloner) {
    // 获取场上所有活着的蚊子
    const aliveMosquitoes = gameState.mosquitoes.filter(m => 
        m.element.style.opacity !== '0' && m.element.parentNode
    );
    
    if (aliveMosquitoes.length === 0) return;
    
    // 随机选择一只蚊子进行克隆
    const targetMosquito = aliveMosquitoes[Math.floor(Math.random() * aliveMosquitoes.length)];
    
    const clone = document.createElement('div');
    clone.className = 'mosquito mosquito-image-only';
    clone.style.left = targetMosquito.x + '%';
    clone.style.top = targetMosquito.y + '%';
    clone.style.opacity = '0.7';
    
    // 根据目标蚊子设置大小
    if (targetMosquito.id === 2) {
        clone.style.transform = 'scale(2)';
    } else if (targetMosquito.id === 4) {
        clone.style.transform = 'scale(1.5)';
    }
    
    const img = document.createElement('img');
    img.className = 'mosquito-image';
    img.src = `wenzi${targetMosquito.id}.png`;
    img.alt = `蚊子${targetMosquito.id}克隆`;
    clone.appendChild(img);
    
    // 如果是3号蚊子，添加血条
    if (targetMosquito.id === 3) {
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        healthBar.innerHTML = `<div class="health-fill" style="width: 100%"></div>`;
        clone.appendChild(healthBar);
    }
    
    gameArea.appendChild(clone);
    
    // 克隆蚊子数据 - 继承原始蚊子的所有属性
    const cloneData = {
        element: clone,
        id: targetMosquito.id,
        x: targetMosquito.x,
        y: targetMosquito.y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        properties: {
            speed: targetMosquito.properties.speed,
            clone: false,
            health: targetMosquito.properties.health,
            heal: false,
            hasCloned: true,
            maxHealth: targetMosquito.properties.maxHealth,
            currentHealth: targetMosquito.properties.maxHealth || 100,
            // 继承攻击属性（如果是3号蚊子）
            attack: targetMosquito.properties.attack || false,
            attackInterval: targetMosquito.properties.attackInterval || 10000
        }
    };
    
    // 如果是1号蚊子，使用原始1号蚊子的速度（vx *= 3）
    if (targetMosquito.id === 1) {
        cloneData.vx *= 3;
        cloneData.vy *= 3;
    }
    
    gameState.mosquitoes.push(cloneData);
}

// 加血功能（4号蚊子给3号加血，补满血量）
function healMosquito(healer) {
    // 查找场上所有活着的3号蚊子
    const targetMosquitoes = gameState.mosquitoes.filter(m => 
        m.id === 3 && 
        m.properties.health && 
        m.element.style.opacity !== '0' &&
        m.element.parentNode
    );
    
    if (targetMosquitoes.length === 0) return;
    
    // 4号蚊子发光效果
    healer.element.style.filter = 'brightness(2) drop-shadow(0 0 10px #4CAF50)';
    setTimeout(() => {
        healer.element.style.filter = '';
    }, 500);
    
    // 给所有3号蚊子补满血量
    targetMosquitoes.forEach(target => {
        // 只有血量未满才加血
        if (target.properties.currentHealth < target.properties.maxHealth) {
            target.properties.currentHealth = target.properties.maxHealth;
            updateHealthBar(target);
            
            // 3号蚊子发光效果
            target.element.style.filter = 'brightness(2) drop-shadow(0 0 10px #4CAF50)';
            setTimeout(() => {
                target.element.style.filter = '';
            }, 500);
        }
    });
}

// 更新血条显示
function updateHealthBar(mosquito) {
    const healthBar = mosquito.element.querySelector('.health-bar');
    if (healthBar) {
        const healthFill = healthBar.querySelector('.health-fill');
        const healthPercent = (mosquito.properties.currentHealth / mosquito.properties.maxHealth) * 100;
        healthFill.style.width = healthPercent + '%';
    }
}

// 蚊子攻击功能（3号蚊子攻击炮台）
function mosquitoAttack(attacker) {
    const attackerRect = attacker.element.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();
    
    // 计算起始位置（蚊子位置）
    const startX = attackerRect.left + attackerRect.width / 2;
    const startY = attackerRect.top + attackerRect.height / 2;
    
    // 计算目标位置（炮台位置）
    const cannonBase = document.querySelector('.cannon-base');
    const cannonRect = cannonBase.getBoundingClientRect();
    const targetX = cannonRect.left + cannonRect.width / 2;
    const targetY = cannonRect.top + cannonRect.height / 2;
    
    // 计算飞行角度
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    
    // 创建攻击子弹（明显区分：紫色圆形）
    const bullet = document.createElement('div');
    bullet.className = 'mosquito-bullet';
    bullet.style.position = 'absolute';
    bullet.style.left = startX + 'px';
    bullet.style.top = startY + 'px';
    bullet.style.width = '12px';
    bullet.style.height = '12px';
    bullet.style.background = 'radial-gradient(circle, #9C27B0, #7B1FA2)';
    bullet.style.borderRadius = '50%';
    bullet.style.border = '2px solid #E1BEE7';
    bullet.style.zIndex = '999';
    bullet.style.pointerEvents = 'none';
    bullet.style.boxShadow = '0 0 8px #9C27B0';
    
    document.body.appendChild(bullet);
    
    let currentX = startX;
    let currentY = startY;
    const speed = 8;
    
    const flyInterval = setInterval(() => {
        currentX += Math.cos(angle) * speed;
        currentY += Math.sin(angle) * speed;
        
        bullet.style.left = currentX + 'px';
        bullet.style.top = currentY + 'px';
        
        // 检测是否击中炮台
        const bulletRect = bullet.getBoundingClientRect();
        if (isColliding(bulletRect, cannonRect)) {
            clearInterval(flyInterval);
            bullet.remove();
            
            // 扣除玩家血量
            gameState.playerHealth = Math.max(0, gameState.playerHealth - 10);
            updatePlayerHealth();
            
            // 炮台受击效果
            cannonBase.style.filter = 'brightness(2) drop-shadow(0 0 10px #f44336)';
            setTimeout(() => {
                cannonBase.style.filter = '';
            }, 300);
            
            // 检查玩家是否死亡
            if (gameState.playerHealth <= 0) {
                showGameOver('lose');
            }
        }
        
        // 检测是否超出屏幕
        if (currentX < -20 || currentX > window.innerWidth + 20 ||
            currentY < -20 || currentY > window.innerHeight + 20) {
            clearInterval(flyInterval);
            bullet.remove();
        }
    }, 20);
}

// 点击时间记录
let lastClickTime = 0;
let bgmStarted = false;
let lastFireTime = 0;
let lastTapTime = 0;
let lastCannonTapTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let firstTouchPos = null; // 记录第一次手指落点位置
let activeTouches = new Map(); // 存储当前活跃的手指

// 绑定事件
function bindEvents() {
    // 红色按钮 - 发射
    btnRed.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 防抖动：300ms内只能发射一次
        const now = Date.now();
        if (now - lastFireTime < 300) {
            return;
        }
        lastFireTime = now;
        
        startBGMOnFirstInteraction();
        setActiveButton('red');
        fire();
    });
    
    // 绿色按钮 - 充电/蓄力（根据点击速度调整充电速度）
    btnGreen.addEventListener('click', () => {
        startBGMOnFirstInteraction();
        setActiveButton('green');
        const currentTime = Date.now();
        const clickInterval = currentTime - lastClickTime;
        lastClickTime = currentTime;
        
        // 根据点击间隔调整充电量：点击越快，充电越多
        let chargeAmount = 5; // 默认充电量
        if (clickInterval < 300) chargeAmount = 15; // 快速点击
        else if (clickInterval < 600) chargeAmount = 10; // 中等速度点击
        
        gameState.power = Math.min(gameState.power + chargeAmount, gameState.maxPower);
        updatePowerBar();
    });
    
    // 左箭头 - 炮口向左旋转（逆时针）
    btnLeft.addEventListener('click', () => {
        startBGMOnFirstInteraction();
        rotateCannon(-5);
    });
    
    // 右箭头 - 炮口向右旋转（顺时针）
    btnRight.addEventListener('click', () => {
        startBGMOnFirstInteraction();
        rotateCannon(5);
    });
    
    // 触摸滑动控制炮筒方向（全屏有效）
    document.addEventListener('touchstart', (e) => {
        // 排除按钮区域
        if (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn')) {
            return;
        }
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        
        // 记录所有手指
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            activeTouches.set(t.identifier, {
                x: t.clientX,
                y: t.clientY
            });
        }
        
        // 记录第一次手指落点
        if (!firstTouchPos && e.touches.length > 0) {
            firstTouchPos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
        
        // 更新调试显示
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.textContent = '';
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        // 排除按钮区域
        if (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn')) {
            return;
        }
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // 计算角度变化（提高灵敏度）
        const angleChange = deltaX * 0.8;
        rotateCannon(angleChange);
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });
    
    // 双击炮筒区域充电（绿色按钮功能）
    const cannonSection = document.querySelector('.cannon-section');
    if (cannonSection) {
        cannonSection.addEventListener('touchend', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，确保充电优先级更高
            const now = Date.now();
            
            // 双击检测：300ms内两次点击
            if (now - lastCannonTapTime < 300) {
                startBGMOnFirstInteraction();
                setActiveButton('green');
                
                // 根据点击间隔调整充电量：点击越快，充电越多
                const currentTime = Date.now();
                const clickInterval = currentTime - lastClickTime;
                lastClickTime = currentTime;
                
                let chargeAmount = 5; // 默认充电量
                if (clickInterval < 300) chargeAmount = 15; // 快速点击
                else if (clickInterval < 600) chargeAmount = 10; // 中等速度点击
                
                gameState.power = Math.min(gameState.power + chargeAmount, gameState.maxPower);
                updatePowerBar();
                
                // 充电时震动
                vibrate(50);
            }
            lastCannonTapTime = now;
        });
    }
    
    // 双击屏幕发射（全屏有效，排除按钮）
    document.addEventListener('touchend', (e) => {
        // 排除按钮区域和炮筒区域（炮筒区域有单独的双击事件）
        if (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn') || e.target.closest('.cannon-section')) {
            return;
        }
        const now = Date.now();
        
        // 获取离开的手指位置
        const leavingTouch = e.changedTouches[0];
        const leavingPos = {
            x: leavingTouch.clientX,
            y: leavingTouch.clientY
        };
        
        // 检查是否有多指触控（还有其他手指在屏幕上）
        let distance = 0;
        if (e.touches.length > 0 && firstTouchPos) {
            // 计算两指距离
            const dx = leavingPos.x - firstTouchPos.x;
            const dy = leavingPos.y - firstTouchPos.y;
            distance = Math.sqrt(dx * dx + dy * dy);
        }
        
        // 移除离开的手指
        for (let i = 0; i < e.changedTouches.length; i++) {
            activeTouches.delete(e.changedTouches[i].identifier);
        }
        
        // 如果没有手指在屏幕上，重置第一次落点
        if (e.touches.length === 0) {
            firstTouchPos = null;
        }
        
        // 更新调试显示
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.textContent = '';
        }
        
        // 多指模式：距离>150px发射追踪飞弹
        if (distance > 150) {
            console.log('距离超过150px，发射追踪飞弹，距离:', distance);
            
            // 防抖动：300ms内只能发射一次
            if (now - lastFireTime < 300) {
                return;
            }
            
            // 检查电力是否满格
            if (gameState.power < gameState.maxPower) {
                // 播放没子弹音效
                pauseBGM();
                meizidanSound.currentTime = 0;
                meizidanSound.play();
                meizidanSound.onended = resumeBGM;
                return;
            }
            
            // 找出离两只手指连线最近的蚊子
            const closestMosquito = findClosestMosquitoToLine(firstTouchPos, leavingPos);
            
            if (closestMosquito) {
                // 标记蚊子
                markMosquito(closestMosquito);
                
                // 更新最后发射时间
                lastFireTime = now;
                
                // 清空电力
                gameState.power = 0;
                updatePowerBar();
                
                // 发射追踪飞弹
                setTimeout(() => {
                    createHomingMissile(closestMosquito);
                }, 300);
            }
        }
        
        // 单指双击模式：普通发射（保持原逻辑不变）
        if (now - lastTapTime < 300) {
            // 防抖动：300ms内只能发射一次
            if (now - lastFireTime < 300) {
                return;
            }
            lastFireTime = now;
            
            startBGMOnFirstInteraction();
            fire();
        }
        lastTapTime = now;
    });
    
    // PC端键盘控制
    let keysPressed = {};
    
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key] = true;
        
        // 空格键：电力蓄积
        if (e.code === 'Space') {
            e.preventDefault();
            startBGMOnFirstInteraction();
            setActiveButton('green');
            
            const currentTime = Date.now();
            const clickInterval = currentTime - lastClickTime;
            lastClickTime = currentTime;
            
            let chargeAmount = 5;
            if (clickInterval < 300) chargeAmount = 15;
            else if (clickInterval < 600) chargeAmount = 10;
            
            gameState.power = Math.min(gameState.power + chargeAmount, gameState.maxPower);
            updatePowerBar();
            
            vibrate(50);
        }
        
        // J键或1键：普通发射
        if ((e.key === 'j' || e.key === 'J' || e.key === '1') && !e.repeat) {
            e.preventDefault();
            const now = Date.now();
            
            if (now - lastFireTime < 300) {
                return;
            }
            lastFireTime = now;
            
            startBGMOnFirstInteraction();
            fire();
        }
        
        // K键或2键：追踪飞弹
        if ((e.key === 'k' || e.key === 'K' || e.key === '2') && !e.repeat) {
            e.preventDefault();
            const now = Date.now();
            
            if (now - lastFireTime < 300) {
                return;
            }
            
            // 检查电力是否满格
            if (gameState.power < gameState.maxPower) {
                pauseBGM();
                meizidanSound.currentTime = 0;
                meizidanSound.play();
                meizidanSound.onended = resumeBGM;
                return;
            }
            
            // 找出离炮筒指向最近的蚊子
            const cannonBase = document.querySelector('.cannon-base');
            const cannonRect = cannonBase.getBoundingClientRect();
            const cannonCenter = {
                x: cannonRect.left + cannonRect.width / 2,
                y: cannonRect.top + cannonRect.height / 2
            };
            
            const angleRad = gameState.cannonAngle * Math.PI / 180;
            const lineEnd = {
                x: cannonCenter.x + Math.cos(angleRad) * 1000,
                y: cannonCenter.y + Math.sin(angleRad) * 1000
            };
            
            const closestMosquito = findClosestMosquitoToLine(cannonCenter, lineEnd);
            
            if (closestMosquito) {
                markMosquito(closestMosquito);
                lastFireTime = now;
                
                // 清空电力
                gameState.power = 0;
                updatePowerBar();
                
                setTimeout(() => {
                    createHomingMissile(closestMosquito);
                }, 300);
            }
        }
        
        // A键或左方向键：向左旋转炮筒
        if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && !e.repeat) {
            e.preventDefault();
            rotateCannon(-5);
        }
        
        // D键或右方向键：向右旋转炮筒
        if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && !e.repeat) {
            e.preventDefault();
            rotateCannon(5);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keysPressed[e.key] = false;
    });
    
    // PC端鼠标控制
    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn') || e.target.closest('.cannon-section')) {
            return;
        }
        
        const now = Date.now();
        
        // 鼠标左键：普通发射
        if (e.button === 0) {
            if (now - lastFireTime < 300) {
                return;
            }
            lastFireTime = now;
            
            startBGMOnFirstInteraction();
            fire();
        }
        
        // 鼠标右键：追踪飞弹
        if (e.button === 2) {
            e.preventDefault();
            
            if (now - lastFireTime < 300) {
                return;
            }
            
            // 检查电力是否满格
            if (gameState.power < gameState.maxPower) {
                pauseBGM();
                meizidanSound.currentTime = 0;
                meizidanSound.play();
                meizidanSound.onended = resumeBGM;
                return;
            }
            
            const cannonBase = document.querySelector('.cannon-base');
            const cannonRect = cannonBase.getBoundingClientRect();
            const cannonCenter = {
                x: cannonRect.left + cannonRect.width / 2,
                y: cannonRect.top + cannonRect.height / 2
            };
            
            const angleRad = gameState.cannonAngle * Math.PI / 180;
            const lineEnd = {
                x: cannonCenter.x + Math.cos(angleRad) * 1000,
                y: cannonCenter.y + Math.sin(angleRad) * 1000
            };
            
            const closestMosquito = findClosestMosquitoToLine(cannonCenter, lineEnd);
            
            if (closestMosquito) {
                markMosquito(closestMosquito);
                lastFireTime = now;
                
                // 清空电力
                gameState.power = 0;
                updatePowerBar();
                
                setTimeout(() => {
                    createHomingMissile(closestMosquito);
                }, 300);
            }
        }
    });
    
    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

// 首次交互时启动背景音乐
function startBGMOnFirstInteraction() {
    if (!bgmStarted) {
        bgmStarted = true;
        bgmSound.play().catch(e => {
            console.log('BGM start failed:', e);
        });
    }
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



// 震动效果
function vibrate(duration = 100) {
    if ('vibrate' in navigator) {
        navigator.vibrate(duration);
    } else if ('webkitVibrate' in navigator) {
        navigator.webkitVibrate(duration);
    }
}

// 发射
function fire() {
    // 发射时震动
    vibrate(150);
    
    // 炮筒动画
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg) scale(1.2)`;
    setTimeout(() => {
        cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg) scale(1)`;
    }, 200);
    
    // 创建炮弹
    createBullet();
}

// 暂停背景音乐
function pauseBGM() {
    if (!bgmSound.paused) {
        bgmSound.pause();
    }
}

// 恢复背景音乐
function resumeBGM() {
    // 检查是否还有蚊子存活
    const aliveMosquitoes = gameState.mosquitoes.filter(m => 
        m.element.style.opacity !== '0' && m.element.parentNode
    );
    
    // 如果所有蚊子都被消灭，不播放背景音乐
    if (aliveMosquitoes.length === 0) {
        return;
    }
    
    bgmSound.play().catch(e => {
        console.log('BGM resume failed:', e);
    });
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
                hit = true;
                hitMosquito = m;
                
                // 检查是否是3号蚊子（有血条）
                if (m.properties.health) {
                    // 每次减少50点血量（打两下消失）
                    m.properties.currentHealth -= 50;
                    updateHealthBar(m);
                    
                    // 播放电击音效
                    pauseBGM();
                    zapperSound.currentTime = 0;
                    zapperSound.play();
                    zapperSound.onended = resumeBGM;
                    
                    // 检查是否死亡
                    if (m.properties.currentHealth <= 0) {
                        m.element.style.transform = 'scale(1.5)';
                        m.element.style.opacity = '0';
                        // 添加分数
                        addScore(m.id);
                    } else {
                        // 受伤动画
                        m.element.style.filter = 'brightness(2)';
                        setTimeout(() => {
                            m.element.style.filter = 'brightness(1)';
                        }, 200);
                    }
                } else {
                    // 普通蚊子直接消灭
                    m.element.style.transform = 'scale(1.5)';
                    m.element.style.opacity = '0';
                    // 添加分数
                    addScore(m.id);
                    
                    // 暂停背景音乐，播放电击音效
                    pauseBGM();
                    zapperSound.currentTime = 0;
                    zapperSound.play();
                    // 音效结束后恢复背景音乐
                    zapperSound.onended = resumeBGM;
                }
            }
        });
        
        // 如果击中蚊子，移除该蚊子
        if (hitMosquito) {
            setTimeout(() => {
                // 只有血量为0或普通蚊子才移除
                if (!hitMosquito.properties.health || hitMosquito.properties.currentHealth <= 0) {
                    hitMosquito.element.remove();
                    const index = gameState.mosquitoes.indexOf(hitMosquito);
                    if (index > -1) {
                        gameState.mosquitoes.splice(index, 1);
                    }
                    updateRadarDots();
                    
                    // 检查是否所有蚊子都被消灭（只计算活着的蚊子）
                    const aliveMosquitoes = gameState.mosquitoes.filter(m => 
                        m.element.style.opacity !== '0' && m.element.parentNode
                    );
                    if (aliveMosquitoes.length === 0) {
                        showGameOver();
                    }
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
function showGameOver(reason = 'win') {
    gameOverModal.style.display = 'flex';
    // 停止背景音乐
    pauseBGM();
    bgmStarted = false;
    // 清除音效结束回调，防止重新播放背景音乐
    zapperSound.onended = null;
    meizidanSound.onended = null;
    // 保存最高分数
    saveHighScore();
    
    // 根据游戏结束原因设置不同的提示信息
    const gameOverText = document.querySelector('#gameOverModal .modal-content h2');
    const gameOverMessage = document.querySelector('#gameOverModal .modal-content p');
    
    if (reason === 'lose') {
        // 血量为空的情况
        if (gameOverText) gameOverText.textContent = '游戏结束';
        if (gameOverMessage) gameOverMessage.textContent = '是否重新再来？';
    } else {
        // 消灭所有蚊子的情况
        if (gameOverText) gameOverText.textContent = '恭喜！全部消灭！';
        if (gameOverMessage) gameOverMessage.textContent = '点击按钮重新开始';
    }
    
    // 重置游戏状态（除了最高分）
    gameState.level = 1;
    gameState.score = 0;
    gameState.playerHealth = gameState.maxPlayerHealth;
    gameState.power = 50;
    gameState.cannonAngle = -90;
    updateScore();
    updatePlayerHealth();
    updatePowerBar();
    if (cannonBarrel) {
        cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
    }
}

// 重新开始游戏
function restartGame() {
    gameOverModal.style.display = 'none';
    // 重置游戏状态到初始值
    gameState.level = 1;
    gameState.score = 0;
    gameState.cannonAngle = -90;
    gameState.playerHealth = gameState.maxPlayerHealth; // 恢复血量
    gameState.power = 50; // 重置电力
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
    updatePowerBar();
    updateLevel();
    updateScore();
    updateBackground();
    updatePlayerHealth();
    spawnMosquitoes();
    
    // 清除所有轨迹线
    while (trailSvg.firstChild) {
        trailSvg.removeChild(trailSvg.firstChild);
    }
    
    // 重新开始电力自动增长
    startPowerCharging();
    
    // 重新开始背景音乐
    bgmStarted = true;
    resumeBGM();
}

// 矩形碰撞检测
function isColliding(rect1, rect2) {
    return rect1.left < rect2.right &&
           rect1.right > rect2.left &&
           rect1.top < rect2.bottom &&
           rect1.bottom > rect2.top;
}

// 计算点到线段的距离
function distanceToLineSegment(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
        xx = lineStart.x; yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x; yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// 找出离线段最近的蚊子
function findClosestMosquitoToLine(lineStart, lineEnd) {
    let closestMosquito = null;
    let minDistance = Infinity;
    
    gameState.mosquitoes.forEach(mosquito => {
        if (mosquito.element.style.opacity === '0') return;
        
        const rect = mosquito.element.getBoundingClientRect();
        const mosquitoPos = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        const distance = distanceToLineSegment(mosquitoPos, lineStart, lineEnd);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestMosquito = mosquito;
        }
    });
    
    return closestMosquito;
}

// 标记蚊子
function markMosquito(mosquito) {
    const existingMark = document.querySelector('.mosquito-mark');
    if (existingMark) {
        existingMark.remove();
    }
    
    const rect = mosquito.element.getBoundingClientRect();
    
    const mark = document.createElement('div');
    mark.className = 'mosquito-mark';
    mark.style.position = 'absolute';
    mark.style.left = rect.left + 'px';
    mark.style.top = rect.top + 'px';
    mark.style.width = '30px';
    mark.style.height = '30px';
    mark.style.backgroundImage = 'url(mz.png)';
    mark.style.backgroundSize = 'contain';
    mark.style.backgroundRepeat = 'no-repeat';
    mark.style.zIndex = '999';
    mark.style.pointerEvents = 'none';
    
    document.body.appendChild(mark);
    
    // 持续更新标记位置
    const updateInterval = setInterval(() => {
        if (!mosquito || mosquito.element.style.opacity === '0' || !document.body.contains(mosquito.element)) {
            clearInterval(updateInterval);
            if (mark.parentNode) {
                mark.remove();
            }
            return;
        }
        
        const newRect = mosquito.element.getBoundingClientRect();
        mark.style.left = newRect.left + 'px';
        mark.style.top = newRect.top + 'px';
    }, 16);
}

// 创建追踪飞弹
function createHomingMissile(target) {
    if (!target) return;
    
    const cannonBase = document.querySelector('.cannon-base');
    const cannonRect = cannonBase.getBoundingClientRect();
    
    const startX = cannonRect.left - 30;
    const startY = cannonRect.top + cannonRect.height / 2;
    
    const missile = document.createElement('div');
    missile.className = 'homing-missile';
    missile.style.position = 'absolute';
    missile.style.left = startX + 'px';
    missile.style.top = startY + 'px';
    missile.style.width = '15px';
    missile.style.height = '6px';
    missile.style.background = 'linear-gradient(90deg, #ff6b6b, #ff8e53)';
    missile.style.borderRadius = '2px';
    missile.style.zIndex = '999';
    missile.style.pointerEvents = 'none';
    
    document.body.appendChild(missile);
    
    let currentX = startX;
    let currentY = startY;
    let angle = 0;
    let speed = 6;
    let turningRate = 0.1;
    
    const flyInterval = setInterval(() => {
        if (!target || target.element.style.opacity === '0') {
            clearInterval(flyInterval);
            missile.remove();
            return;
        }
        
        const targetRect = target.element.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;
        
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const targetAngle = Math.atan2(dy, dx);
        
        angle += (targetAngle - angle) * turningRate;
        
        currentX += Math.cos(angle) * speed;
        currentY += Math.sin(angle) * speed;
        
        missile.style.left = currentX + 'px';
        missile.style.top = currentY + 'px';
        missile.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
        
        const missileRect = missile.getBoundingClientRect();
        
        if (isColliding(missileRect, targetRect)) {
            clearInterval(flyInterval);
            missile.remove();
            
            // 移除标记
            const mark = document.querySelector('.mosquito-mark');
            if (mark) {
                mark.remove();
            }
            
            // 检查是否是3号蚊子（有血条）
            if (target.properties.health) {
                target.properties.currentHealth = 0;
                updateHealthBar(target);
                
                pauseBGM();
                zapperSound.currentTime = 0;
                zapperSound.play();
                zapperSound.onended = resumeBGM;
                
                target.element.style.transform = 'scale(1.5)';
                target.element.style.opacity = '0';
                addScore(target.id);
            } else {
                target.element.style.transform = 'scale(1.5)';
                target.element.style.opacity = '0';
                addScore(target.id);
                
                pauseBGM();
                zapperSound.currentTime = 0;
                zapperSound.play();
                zapperSound.onended = resumeBGM;
            }
            
            // 延迟移除蚊子
            setTimeout(() => {
                if (!target.properties.health || target.properties.currentHealth <= 0) {
                    target.element.remove();
                    const index = gameState.mosquitoes.indexOf(target);
                    if (index > -1) {
                        gameState.mosquitoes.splice(index, 1);
                    }
                    updateRadarDots();
                    
                    const aliveMosquitoes = gameState.mosquitoes.filter(m => 
                        m.element.style.opacity !== '0' && m.element.parentNode
                    );
                    if (aliveMosquitoes.length === 0) {
                        showGameOver();
                    }
                }
            }, 500);
        }
        
        if (currentX < -50 || currentX > window.innerWidth + 50 ||
            currentY < -50 || currentY > window.innerHeight + 50) {
            clearInterval(flyInterval);
            missile.remove();
        }
    }, 10);
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
