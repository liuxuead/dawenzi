// Game state
const gameState = {
    power: 50,
    maxPower: 50,
    energy: 100,
    maxEnergy: 100,
    isCharging: false,
    activeButton: null,
    mosquitoes: [],
    cannonAngle: -90,
    playerHealth: 100,
    maxPlayerHealth: 100,
    level: 1,
    score: 0,
    highScore: parseInt(localStorage.getItem('highScore')) || 0,
    powerTimer: null,
    healthTimer: null,
    energyTimer: null,
    gameOverReason: null
};

// Image preload function
function preloadImages(imageUrls) {
    return new Promise((resolve, reject) => {
        if (!imageUrls || imageUrls.length === 0) {
            resolve();
            return;
        }
        
        let loadedCount = 0;
        const totalCount = imageUrls.length;
        
        imageUrls.forEach(url => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === totalCount) {
                    resolve();
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${url}`);
                loadedCount++;
                if (loadedCount === totalCount) {
                    resolve();
                }
            };
            img.src = url;
        });
    });
}

// Load images for specified level
function loadLevelImages(level) {
    const images = [];
    
    // Background image
    images.push(`background${level}.jpg`);
    
    // Mosquito images
    for (let i = 1; i <= 5; i++) {
        images.push(`wenzi${i}.png`);
    }
    
    return preloadImages(images);
}

// Mosquito score configuration
const mosquitoScores = {
    1: 20,
    2: 50,
    3: 40,
    4: 10,
    5: 10
};

// DOM elements
const powerFill = document.getElementById('powerFill');
const energyFill = document.getElementById('energyFill');
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
const loadingModal = document.getElementById('loadingModal');
const zapperSound = document.getElementById('zapperSound');
const meizidanSound = document.getElementById('meizidanSound');
const bgmSound = document.getElementById('bgmSound');
const trailSvg = document.getElementById('trailSvg');

// Start automatic power charging
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

// Start automatic energy recovery
function startEnergyCharging() {
    if (gameState.energyTimer) {
        clearInterval(gameState.energyTimer);
    }
    
    gameState.energyTimer = setInterval(() => {
        if (gameState.energy < gameState.maxEnergy) {
            const chargeAmount = gameState.maxEnergy * 0.05;
            gameState.energy = Math.min(gameState.energy + chargeAmount, gameState.maxEnergy);
            updateEnergyBar();
        }
    }, 1000);
}

// Activate laser sight
function activateLaser() {
    // If laser is already active, don't activate again
    if (laserActive) {
        return;
    }
    
    // 消耗能量
    if (gameState.energy < LASER_COST) {
        return;
    }
    gameState.energy = Math.max(0, gameState.energy - LASER_COST);
    updateEnergyBar();
    
    laserActive = true;
    laserStartTime = Date.now();
    
    // Create laser sight element
    if (!laserLine || !laserLine.parentNode) {
        // If laser line element doesn't exist or not in DOM, recreate it
        laserLine = document.createElement('div');
        laserLine.className = 'laser-line';
        laserLine.style.position = 'fixed'; // 使用fixed定位，与红黑线一致
        laserLine.style.height = '2px';
        laserLine.style.backgroundColor = '#4CAF50';
        laserLine.style.zIndex = '12'; // 激光显示在红黑线上面
        laserLine.style.pointerEvents = 'none';
        laserLine.style.boxShadow = '0 0 10px #4CAF50, 0 0 20px #4CAF50';
        document.body.appendChild(laserLine);
    } else {
        laserLine.style.display = 'block';
    }
    
    // Start laser update
    updateLaser();
    
    // Close laser after 0.5 seconds
    setTimeout(() => {
        deactivateLaser();
    }, LASER_DURATION);
}

// Deactivate laser sight
function deactivateLaser() {
    laserActive = false;
    if (laserLine) {
        laserLine.style.display = 'none';
    }
    
    // Restore all mosquitoes' colors
    gameState.mosquitoes.forEach(mosquito => {
        if (mosquito.element) {
            mosquito.element.style.filter = '';
        }
    });
}

// 更新激光瞄准线
function updateLaser() {
    if (!laserActive || !laserLine) {
        return;
    }
    
    // 获取炮筒位置信息（与红黑线使用相同的计算方式）
    const cannonSection = document.querySelector('.cannon-section');
    if (!cannonSection) {
        return;
    }
    
    const cannonRect = cannonSection.getBoundingClientRect();
    const cannonBaseX = cannonRect.left + cannonRect.width / 2;
    const cannonBaseY = cannonRect.bottom;
    
    // 炮筒长度（与模拟炮筒相同）
    const cannonLength = 150;
    
    // 使用当前红线的角度
    const angleRad = currentLineAngle * Math.PI / 180;
    
    // 计算炮筒末端位置（红黑交接处）
    const cannonEndX = cannonBaseX + Math.cos(angleRad) * cannonLength;
    const cannonEndY = cannonBaseY + Math.sin(angleRad) * cannonLength;
    
    // 计算激光终点（延伸到屏幕外）
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 计算激光延伸到屏幕外的终点
    let endX, endY;
    
    // 根据角度计算延伸方向
    if (Math.abs(Math.cos(angleRad)) > Math.abs(Math.sin(angleRad))) {
        // 水平方向延伸
        endX = Math.cos(angleRad) > 0 ? screenWidth + 100 : -100;
        endY = cannonEndY + (endX - cannonEndX) * Math.tan(angleRad);
    } else {
        // 垂直方向延伸
        endY = Math.sin(angleRad) > 0 ? screenHeight + 100 : -100;
        endX = cannonEndX + (endY - cannonEndY) / Math.tan(angleRad);
    }
    
    // 计算激光线的长度和角度
    const length = Math.sqrt(Math.pow(endX - cannonEndX, 2) + Math.pow(endY - cannonEndY, 2));
    const lineAngle = currentLineAngle;
    
    // 设置激光线样式
    laserLine.style.left = cannonEndX + 'px';
    laserLine.style.top = cannonEndY - 1 + 'px'; // 垂直居中
    laserLine.style.width = length + 'px';
    laserLine.style.transformOrigin = '0 50%';
    laserLine.style.transform = `rotate(${lineAngle}deg)`;
    laserLine.style.display = 'block';
    
    // 检测并消灭激光线上的蚊子
    const gameAreaRect = gameArea.getBoundingClientRect();
    const mosquitoesToRemove = [];
    
    gameState.mosquitoes.forEach(mosquito => {
        if (mosquito.element && mosquito.element.style.opacity !== '0' && !mosquito.element.style.animation) {
            const mosquitoRect = mosquito.element.getBoundingClientRect();
            const mosquitoX = (mosquitoRect.left + mosquitoRect.right) / 2;
            const mosquitoY = (mosquitoRect.top + mosquitoRect.bottom) / 2;
            
            const distance = pointToLineDistance(mosquitoX, mosquitoY, cannonEndX, cannonEndY, endX, endY);
            
            if (distance < 20) {
                // 给蚊子发绿光
                mosquito.element.style.filter = 'brightness(1.5) drop-shadow(0 0 10px #4CAF50)';
                
                // 标记为要移除
                gameState.score += 10;
                updateScore();
                
                // 应用消失动画
                mosquito.element.style.animation = 'disappear 0.5s forwards';
                mosquitoesToRemove.push(mosquito.id);
                
                // 立即移除滤镜，避免与动画冲突
                setTimeout(() => {
                    if (mosquito.element) {
                        mosquito.element.style.filter = '';
                    }
                }, 10);
            }
        }
    });
    
    // 移除被激光消灭的蚊子
    if (mosquitoesToRemove.length > 0) {
        gameState.mosquitoes = gameState.mosquitoes.filter(m => !mosquitoesToRemove.includes(m.id));
    }
    
    // 继续更新激光
    if (laserActive) {
        requestAnimationFrame(updateLaser);
    }
}

// 计算点到线段的距离
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// 更新雷达尺寸，使其与游戏画面保持相同宽高比
function updateRadarSize() {
    if (!gameArea || !radar) return;
    
    const gameAreaRect = gameArea.getBoundingClientRect();
    const aspectRatio = gameAreaRect.width / gameAreaRect.height;
    
    // 设定雷达的基准大小（最大边80px）
    const maxSize = 80;
    
    if (aspectRatio >= 1) {
        // 游戏画面是横屏或正方形
        radar.style.width = maxSize + 'px';
        radar.style.height = (maxSize / aspectRatio) + 'px';
    } else {
        // 游戏画面是竖屏
        radar.style.height = maxSize + 'px';
        radar.style.width = (maxSize * aspectRatio) + 'px';
    }
}

// 初始化
async function init() {
    console.log('Game init started');
    
    // 显示加载界面
    if (loadingModal) {
        loadingModal.style.display = 'flex';
    }
    
    try {
        // 预加载当前轮次的图片
        await loadLevelImages(gameState.level);
        console.log('Images loaded successfully');
    } catch (error) {
        console.warn('Error loading images:', error);
    } finally {
        // 隐藏加载界面
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }
    
    // 先更新雷达尺寸
    updateRadarSize();
    
    initCanvas();
    updateBackground();
    updatePowerBar();
    updateEnergyBar();
    updatePlayerHealth();
    updateLevel();
    updateScore();
    // 移除这里的 spawnMosquitoes() 和 startMosquitoMovement() 调用
    // 这些应该在用户点击开始后才调用
    startEnergyCharging();
    bindEvents();
    initBGM();
    
    // 初始化时让炮筒指向当前鼠标位置
    setTimeout(() => {
        const event = new MouseEvent('mousemove', {
            clientX: window.innerWidth / 2,
            clientY: window.innerHeight / 2
        });
        document.dispatchEvent(event);
    }, 100);
    
    // 调用 restartGame 来确保游戏状态与重新开始后的状态一致
    await restartGame();
    
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
    
    // 根据电力值显示不同数量的飞弹图标
    const missileIcon1 = document.getElementById('missileIcon1');
    const missileIcon2 = document.getElementById('missileIcon2');
    const missileIcon3 = document.getElementById('missileIcon3');
    
    const powerRatio = gameState.power / gameState.maxPower;
    
    if (missileIcon1) {
        if (powerRatio >= 1/3) {
            missileIcon1.classList.add('visible');
        } else {
            missileIcon1.classList.remove('visible');
        }
    }
    
    if (missileIcon2) {
        if (powerRatio >= 2/3) {
            missileIcon2.classList.add('visible');
        } else {
            missileIcon2.classList.remove('visible');
        }
    }
    
    if (missileIcon3) {
        if (powerRatio >= 1) {
            missileIcon3.classList.add('visible');
        } else {
            missileIcon3.classList.remove('visible');
        }
    }
}

// 更新能量条
function updateEnergyBar() {
    if (energyFill) {
        energyFill.style.width = (gameState.energy / gameState.maxEnergy * 100) + '%';
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
function createMosquito(mosquitoId, index) {
    const mosquito = document.createElement('div');
    mosquito.className = 'mosquito mosquito-image-only';
    mosquito.style.left = Math.random() * 80 + 10 + '%';
    mosquito.style.top = Math.random() * 60 + 10 + '%';
    
    // 清空可能的文本内容
    mosquito.textContent = '';
    
    const img = document.createElement('img');
    img.className = 'mosquito-image';
    img.src = `wenzi${mosquitoId}.png`;
    img.alt = `蚊子${mosquitoId}`;
    img.style.pointerEvents = 'none'; // 避免图片干扰点击
    mosquito.appendChild(img);
    
    gameArea.appendChild(mosquito);
    
    let mosquitoData = {
        element: mosquito,
        id: `${mosquitoId}-${Date.now()}-${index}`, // 唯一ID
        type: mosquitoId, // 保持类型信息
        x: parseFloat(mosquito.style.left),
        y: parseFloat(mosquito.style.top),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        properties: {
            speed: 1,
            clone: false,
            health: false,
            heal: false,
            maxHealth: 100,
            currentHealth: 100
        }
    };
    
    // 根据轮次计算初始攻击延迟
    // 第1轮：立即(0秒)，第2轮：2秒，第3轮：4秒，第4轮：6秒，第5轮：8秒，第6轮及以后：0秒
    let initialAttackDelay = 0;
    if (gameState.level === 2) initialAttackDelay = 2000;
    else if (gameState.level === 3) initialAttackDelay = 4000;
    else if (gameState.level === 4) initialAttackDelay = 6000;
    else if (gameState.level === 5) initialAttackDelay = 8000;
    
    switch (mosquitoId) {
        case 1:
            mosquitoData.properties.speed = 6;
            mosquitoData.properties.attack = true;
            mosquitoData.properties.attackInterval = 5000;
            mosquitoData.properties.attackDamage = 15;
            // 所有轮次都从现在开始计时，到时间后再攻击
            mosquitoData.properties.lastAttackTime = Date.now();
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
            mosquitoData.properties.attackInterval = 2000;
            mosquitoData.properties.attackDamage = 10;
            // 所有轮次都从现在开始计时，到时间后再攻击
            mosquitoData.properties.lastAttackTime = Date.now();
            addHealthBar(mosquito, 100);
            break;
        case 4:
            mosquitoData.properties.heal = true;
            mosquitoData.properties.healInterval = 2000;
            mosquito.style.transform = 'scale(1.5)';
            break;
        case 5:
            mosquitoData.properties.stealth = true;
            mosquitoData.properties.attack = true;
            mosquitoData.properties.attackDamage = 5;
            mosquitoData.properties.attackInterval = 5000;
            // 所有轮次都从现在开始计时，到时间后再攻击
            mosquitoData.properties.lastAttackTime = Date.now();
            break;
    }
    
    return mosquitoData;
}

// 生成蚊子
function spawnMosquitoes() {
    gameArea.innerHTML = '';
    gameState.mosquitoes = [];
    
    // 重置激光瞄准线变量（因为gameArea.innerHTML会清除激光线元素）
    laserActive = false;
    laserLine = null;
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    // 获取当前轮次的配置
    let config;
    if (gameState.level <= 8) {
        // 第1-8轮使用固定配置
        config = { ...levelConfigs[gameState.level] };
    } else {
        // 第9轮及以后，1号和3号蚊子数量动态增加
        const extraCount = gameState.level - 8;
        config = {
            1: 4 + extraCount,  // 1号：4 + (level - 8)
            2: 3,               // 2号：保持第8轮配置
            3: 3 + extraCount,  // 3号：3 + (level - 8)
            4: 3,               // 4号：保持第8轮配置
            5: 3                // 5号：保持第8轮配置
        };
    }
    
    // 根据配置生成蚊子
    for (let mosquitoId = 1; mosquitoId <= 5; mosquitoId++) {
        const count = config[mosquitoId] || 0;
        for (let i = 0; i < count; i++) {
            const mosquitoData = createMosquito(mosquitoId, i);
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
        // 只跳过已移除的蚊子，保留对透明度的检查，让雷达只显示可见的蚊子
        if (!m.element.parentNode) return;
        
        const dot = document.createElement('div');
        dot.className = 'radar-dot';
        
        // 雷达现在已经和游戏画面同比例，直接按百分比映射
        // 留出10%的边距
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
    // 清除旧的回血定时器
    if (gameState.healthTimer) {
        clearInterval(gameState.healthTimer);
    }
    
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
                // 确保 lastAttackTime 已初始化
                if (!m.properties.lastAttackTime) {
                    m.properties.lastAttackTime = now;
                    return;
                }
                if (now - m.properties.lastAttackTime >= m.properties.attackInterval) {
                    mosquitoAttack(m);
                    m.properties.lastAttackTime = now;
                }
            }
        });
    }, 1000);
    
    // 玩家血量自动回复（每秒回复2点）
    gameState.healthTimer = setInterval(() => {
        if (gameState.playerHealth < gameState.maxPlayerHealth) {
            gameState.playerHealth = Math.min(gameState.playerHealth + 5, gameState.maxPlayerHealth);
            updatePlayerHealth();
        }
    }, 1000);
    
    // 5号蚊子：隐身能力（现身5秒，隐身2秒，隐身前呼吸1秒）
    gameState.mosquitoes.forEach(m => {
        if (m.properties.stealth && m.element.style.opacity !== '0') {
            startStealthAbility(m);
        }
    });
}

// 5号蚊子：隐身能力
function startStealthAbility(mosquito) {
    // 初始状态：现身
    let isStealth = false;
    
    function toggleStealth() {
        // 只检查蚊子是否存在于DOM中，不检查可见性
        if (!mosquito.element.parentNode) {
            return;
        }
        
        // 准备隐身：呼吸状态1秒
        mosquito.element.style.animation = 'breathing 1s ease-in-out infinite';
        
        setTimeout(() => {
            // 只检查蚊子是否存在于DOM中，不检查可见性
            if (!mosquito.element.parentNode) {
                return;
            }
            
            mosquito.element.style.animation = '';
            // 进入隐身状态（2秒）
            isStealth = true;
            mosquito.element.style.opacity = '0';
            
            setTimeout(() => {
                // 只检查蚊子是否存在于DOM中，不检查可见性
                if (!mosquito.element.parentNode) {
                    return;
                }
                // 结束隐身：现身（5秒）
                isStealth = false;
                mosquito.element.style.opacity = '1';
                
                setTimeout(toggleStealth, 5000);
            }, 2000);
        }, 1000);
    }
    
    // 开始隐身循环
    toggleStealth();
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
    
    // 根据轮次计算初始攻击延迟（克隆蚊子也遵循同样的规则）
    let cloneInitialAttackDelay = 0;
    if (gameState.level === 2) cloneInitialAttackDelay = 2000;
    else if (gameState.level === 3) cloneInitialAttackDelay = 4000;
    else if (gameState.level === 4) cloneInitialAttackDelay = 6000;
    else if (gameState.level === 5) cloneInitialAttackDelay = 8000;
    
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
            stealth: targetMosquito.properties.stealth || false,
            hasCloned: true,
            maxHealth: targetMosquito.properties.maxHealth,
            currentHealth: targetMosquito.properties.maxHealth || 100,
            // 继承攻击属性
            attack: targetMosquito.properties.attack || false,
            attackInterval: targetMosquito.properties.attackInterval || 10000,
            attackDamage: targetMosquito.properties.attackDamage || 10,
            // 第1轮立即攻击，其他轮次从0开始计时
            lastAttackTime: gameState.level === 1 ? 0 : Date.now()
        }
    };
    
    // 如果是1号蚊子，使用原始1号蚊子的速度（vx *= 6）
    if (targetMosquito.id === 1) {
        cloneData.vx *= 6;
        cloneData.vy *= 6;
    }
    
    gameState.mosquitoes.push(cloneData);
    
    // 如果是5号蚊子的分身，启动隐身能力
    if (cloneData.properties.stealth) {
        startStealthAbility(cloneData);
    }
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
            
            // 扣除玩家血量（根据蚊子的攻击伤害）
            const damage = attacker.properties.attackDamage || 10;
            gameState.playerHealth = Math.max(0, gameState.playerHealth - damage);
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

let lastFireTime = 0;
let lastTapTime = 0;
let lastCannonTapTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let firstTouchPos = null; // 记录第一次手指落点位置
let activeTouches = new Map(); // 存储当前活跃的手指
let currentLineAngle = 0; // 存储当前红线角度

// 激光瞄准线相关变量
let longPressTimer = null;
let laserLine = null;
let laserActive = false;
let laserStartTime = 0;
const LASER_DURATION = 500; // 激光持续时间0.5秒
const LASER_COST = 100; // 每次使用激光消耗100%能量

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
        // 检查事件对象是否有效
        if (!e || !e.touches || e.touches.length === 0) return;
        
        // 排除按钮区域
        if (e.target && typeof e.target.closest === 'function') {
            if (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn')) {
                return;
            }
        }
        
        // 检查是否在炮筒区域内
        const cannonSection = document.querySelector('.cannon-section');
        if (cannonSection) {
            const touch = e.touches[0];
            const cannonRect = cannonSection.getBoundingClientRect();
            
            // 检查是否在炮筒区域内（左右各扩展30像素，上下各扩展100像素）
            if (touch.clientX >= cannonRect.left - 30 && touch.clientX <= cannonRect.right + 30 && 
                touch.clientY >= cannonRect.top - 100 && touch.clientY <= cannonRect.bottom + 100) {
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            }
        } else {
            // 如果找不到炮筒区域，仍然更新触摸起点（防止错误）
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
        
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
        
        // 长按检测：0.5秒后激活激光瞄准线
        longPressTimer = setTimeout(() => {
            if (gameState.energy >= gameState.maxEnergy) {
                // 消耗能量
                gameState.energy = Math.max(0, gameState.energy - gameState.maxEnergy);
                updateEnergyBar();
                
                // 激活激光瞄准线
                activateLaser();
            }
        }, 500);
        
        // 更新调试显示
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.textContent = '';
        }
    }, { passive: false });
    
    // 触摸滑动控制炮筒方向（全屏有效）
    document.addEventListener('touchmove', (e) => {
        // 检查事件对象是否有效
        if (!e || !e.touches || e.touches.length === 0) return;
        
        // 检查是否在炮筒区域内
        const cannonSection = document.querySelector('.cannon-section');
        if (!cannonSection) return;
        
        const touch = e.touches[0];
        const cannonRect = cannonSection.getBoundingClientRect();
        
        // 扩大检测区域，包括炮筒延伸方向（左右各扩展30像素，上下各扩展100像素）
        if (touch.clientX >= cannonRect.left - 30 && touch.clientX <= cannonRect.right + 30 && 
            touch.clientY >= cannonRect.top - 100 && touch.clientY <= cannonRect.bottom + 100) {
            // 如果是第一次进入炮筒区域，更新触摸起点
            if (!touchStartX || !touchStartY) {
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            }
            
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            // 只有当移动距离超过一定阈值时才阻止默认行为
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                e.preventDefault();
                
                // 计算角度变化（提高灵敏度）
                const angleChange = deltaX * 0.8;
                rotateCannon(angleChange);
                
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            }
        } else {
            // 当手指离开炮筒区域时，重置触摸起点
            touchStartX = null;
            touchStartY = null;
        }
    }, { passive: false });
    
    // 双击炮筒区域充电（绿色按钮功能）
    const cannonSection = document.querySelector('.cannon-section');
    if (cannonSection) {
        cannonSection.addEventListener('touchend', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，确保充电优先级更高
            
            // 清除长按计时器
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
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
        // 检查事件对象是否有效
        if (!e || !e.changedTouches || e.changedTouches.length === 0) return;
        
        // 排除按钮区域和炮筒区域（炮筒区域有单独的双击事件）
        if (e.target && typeof e.target.closest === 'function') {
            if (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn') || e.target.closest('.cannon-section')) {
                return;
            }
        }
        
        // 清除长按计时器
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
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
        if (e.touches && e.touches.length > 0 && firstTouchPos) {
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
        if (e.touches && e.touches.length === 0) {
            firstTouchPos = null;
        }
        
        // 更新调试显示
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            debugInfo.textContent = '';
        }
        
        // 检查离开的手指位置是否在蚊子活动区域内
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;
        
        const gameAreaRect = gameArea.getBoundingClientRect();
        const gameAreaWidth = gameAreaRect.width;
        const gameAreaHeight = gameAreaRect.height;
        
        // 蚊子活动区域边界（与 startMosquitoMovement 函数中保持一致）
        const mosquitoAreaLeft = gameAreaRect.left + gameAreaWidth * 0.05;
        const mosquitoAreaRight = gameAreaRect.left + gameAreaWidth * 0.9;
        const mosquitoAreaTop = gameAreaRect.top + gameAreaHeight * 0.05;
        const mosquitoAreaBottom = gameAreaRect.top + gameAreaHeight * 0.7;
        
        // 检查离开的手指是否在蚊子活动区域内
        const isInMosquitoArea = leavingPos.x >= mosquitoAreaLeft && 
                                leavingPos.x <= mosquitoAreaRight && 
                                leavingPos.y >= mosquitoAreaTop && 
                                leavingPos.y <= mosquitoAreaBottom;
        
        // 多指模式：距离>150px发射追踪飞弹
        if (distance > 150 || isInMosquitoArea) {
            console.log('距离超过150px或点击在蚊子活动区域，发射追踪飞弹，距离:', distance, '是否在活动区域:', isInMosquitoArea);
            
            // 防抖动：300ms内只能发射一次
            if (now - lastFireTime < 300) {
                return;
            }
            
            // 检查电力是否足够（需要1/3电力）
            if (gameState.power < gameState.maxPower / 3) {
                // 不再播放meizidan音效
                return;
            }
            
            let closestMosquito;
            if (isInMosquitoArea) {
                // 点击在蚊子活动区域内，找出离点击位置最近的蚊子
                closestMosquito = findClosestMosquitoToPoint(leavingPos);
            } else {
                // 多指滑动，找出离两只手指连线最近的蚊子
                closestMosquito = findClosestMosquitoToLine(firstTouchPos, leavingPos);
            }
            
            if (closestMosquito) {
                // 标记蚊子
                markMosquito(closestMosquito);
                
                // 更新最后发射时间
                lastFireTime = now;
                
                // 消耗1/3电力
                gameState.power = Math.max(0, gameState.power - gameState.maxPower / 3);
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
            
            // 检查电力是否足够（需要1/3电力）
            if (gameState.power < gameState.maxPower / 3) {
                // 不再播放meizidan音效
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
                
                // 消耗1/3电力
                gameState.power = Math.max(0, gameState.power - gameState.maxPower / 3);
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
    let mouseDownTime = 0;
    let longPressTimer = null;
    let lastLeftClickTime = 0;
    
    document.addEventListener('mousedown', (e) => {
        // 排除按钮区域
        if (e.target && typeof e.target.closest === 'function' && (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn'))) {
            return;
        }
        
        const now = Date.now();
        
        // 鼠标左键：单击发射普通炮弹，长按激活激光瞄准线
        if (e.button === 0) {
            // 长按检测：0.5秒后激活激光瞄准线
            mouseDownTime = now;
            longPressTimer = setTimeout(() => {
                if (gameState.energy >= gameState.maxEnergy) {
                    // 消耗能量
                    gameState.energy = Math.max(0, gameState.energy - gameState.maxEnergy);
                    updateEnergyBar();
                    
                    // 激活激光瞄准线
                    activateLaser();
                }
            }, 500);
        }
        
        // 鼠标右键：点击发射追踪飞弹
        if (e.button === 2) {
            e.preventDefault(); // 阻止默认的右键菜单
            console.log('右键 mousedown 事件触发，已阻止默认行为');
            
            // 确保用户已交互，获取音频播放权限
            console.log('调用 startBGMOnFirstInteraction()');
            startBGMOnFirstInteraction();
            console.log('bgmStarted:', bgmStarted);
            
            // 立即记录鼠标按下时间，确保右键点击的响应速度
            mouseDownTime = now;
            console.log('记录鼠标按下时间:', mouseDownTime);
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        // 处理左键点击
        if (e.button === 0 && longPressTimer) {
            clearTimeout(longPressTimer);
            
            // 如果没有长按超过0.5秒，则发射普通炮弹
            const now = Date.now();
            if (now - mouseDownTime < 500) {
                // 防抖动：300ms内只能发射一次
                if (now - lastFireTime < 300) {
                    return;
                }
                lastFireTime = now;
                
                startBGMOnFirstInteraction();
                fire();
            }
            
            longPressTimer = null;
        }
        
        // 处理右键点击（独立于longPressTimer）
        if (e.button === 2) {
            console.log('右键 mouseup 事件触发');
            const now = Date.now();
            console.log('当前时间:', now);
            console.log('鼠标按下时间:', mouseDownTime);
            console.log('时间差:', now - mouseDownTime);
            // 防抖动：300ms内只能发射一次
            console.log('最后发射时间:', lastFireTime);
            console.log('与最后发射时间的差:', now - lastFireTime);
            if (now - lastFireTime < 300) {
                console.log('防抖动，忽略点击');
                return;
            }
            
            // 确保用户已交互，获取音频播放权限
            console.log('再次调用 startBGMOnFirstInteraction()');
            startBGMOnFirstInteraction();
            console.log('bgmStarted:', bgmStarted);
            
            // 检查电力是否足够（需要1/3电力）
            console.log('当前电力:', gameState.power);
            console.log('最大电力:', gameState.maxPower);
            console.log('需要电力:', gameState.maxPower / 3);
            if (gameState.power < gameState.maxPower / 3) {
                console.log('电力不足，返回');
                // 不再播放meizidan音效
                return;
            }
            
            // 获取鼠标点击位置
            const clickPos = {
                x: e.clientX,
                y: e.clientY
            };
            
            // 检查点击位置是否在蚊子活动区域内
            const gameAreaRect = document.querySelector('.game-area').getBoundingClientRect();
            const gameAreaWidth = gameAreaRect.width;
            const gameAreaHeight = gameAreaRect.height;
            
            // 蚊子活动区域边界（与 startMosquitoMovement 函数中保持一致）
            const mosquitoAreaLeft = gameAreaRect.left + gameAreaWidth * 0.05;
            const mosquitoAreaRight = gameAreaRect.left + gameAreaWidth * 0.9;
            const mosquitoAreaTop = gameAreaRect.top + gameAreaHeight * 0.05;
            const mosquitoAreaBottom = gameAreaRect.top + gameAreaHeight * 0.7;
            
            // 检查点击位置是否在蚊子活动区域内
            const isInMosquitoArea = clickPos.x >= mosquitoAreaLeft && 
                                    clickPos.x <= mosquitoAreaRight && 
                                    clickPos.y >= mosquitoAreaTop && 
                                    clickPos.y <= mosquitoAreaBottom;
            
            console.log('右键点击坐标:', clickPos.x, clickPos.y);
            console.log('蚊子活动区域:', {
                left: mosquitoAreaLeft,
                right: mosquitoAreaRight,
                top: mosquitoAreaTop,
                bottom: mosquitoAreaBottom
            });
            console.log('是否在活动区域内:', isInMosquitoArea);
            
            let closestMosquito;
            if (isInMosquitoArea) {
                // 点击在蚊子活动区域内，找出离点击位置最近的蚊子
                closestMosquito = findClosestMosquitoToPoint(clickPos);
            } else {
                // 点击在蚊子活动区域外，使用炮筒指向的方向
                const cannonBase = document.querySelector('.cannon-base');
                const cannonRect = cannonBase.getBoundingClientRect();
                const cannonCenter = {
                    x: cannonRect.left + cannonRect.width / 2,
                    y: cannonRect.top + cannonRect.height / 2
                };
                
                // 计算炮筒指向的方向
                const angleRad = gameState.cannonAngle * Math.PI / 180;
                const lineEnd = {
                    x: cannonCenter.x + Math.cos(angleRad) * 1000,
                    y: cannonCenter.y + Math.sin(angleRad) * 1000
                };
                
                console.log('炮筒中心坐标:', cannonCenter.x, cannonCenter.y);
                console.log('炮筒指向终点坐标:', lineEnd.x, lineEnd.y);
                
                // 找出离炮筒指向方向最近的蚊子
                closestMosquito = findClosestMosquitoToLine(cannonCenter, lineEnd);
            }
            
            if (closestMosquito) {
                console.log('找到最近的蚊子:', {
                    id: closestMosquito.id,
                    x: closestMosquito.x,
                    y: closestMosquito.y,
                    element: closestMosquito.element
                });
                
                // 标记蚊子
                markMosquito(closestMosquito);
                
                // 更新最后发射时间
                lastFireTime = now;
                
                // 消耗1/3电力
                gameState.power = Math.max(0, gameState.power - gameState.maxPower / 3);
                updatePowerBar();
                
                // 发射追踪飞弹
                setTimeout(() => {
                    createHomingMissile(closestMosquito);
                }, 300);
            } else {
                console.log('未找到可锁定的蚊子');
            }
        }
    });
    
    // 鼠标移动时控制炮筒方向
    let lastMousePos = { x: 0, y: 0 }; // 跟踪最后一次鼠标位置
    document.addEventListener('mousemove', (e) => {
        // 排除按钮区域
        if (e.target && typeof e.target.closest === 'function' && (e.target.closest('.controls') || e.target.closest('.control-btn') || e.target.closest('.arrow-btn'))) {
            return;
        }
        
        // 更新最后一次鼠标位置
        lastMousePos = { x: e.clientX, y: e.clientY };
        
        const gameArea = document.querySelector('.game-area');
        const cannonSection = document.querySelector('.cannon-section');
        const cannonBarrel = document.getElementById('cannonBarrel');
        
        if (!gameArea || !cannonSection || !cannonBarrel) {
            return;
        }
        
        // 获取炮筒位置信息
        const cannonRect = cannonSection.getBoundingClientRect();
        
        // 计算炮底位置（炮身与炮台的交接点）
        const cannonBaseX = cannonRect.left + cannonRect.width / 2;
        const cannonBaseY = cannonRect.bottom;
        
        // 计算鼠标相对于炮底的角度
        const deltaX = e.clientX - cannonBaseX;
        const deltaY = e.clientY - cannonBaseY;
        
        // 计算角度（弧度转角度）- 修正角度计算
        let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI - 90;
        
        // 直接设置角度，不使用平滑过渡，确保实时跟随
        gameState.cannonAngle = angle;
        
        // 更新炮筒位置 - 隐藏真实炮筒，只显示模拟的炮筒线条
        cannonBarrel.style.display = 'none'; // 隐藏真实炮筒
        cannonBarrel.style.transformOrigin = '50% 100%'; // 确保旋转中心在炮底
        cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
        
        // 显示红线从炮底到鼠标，下面1/3段为黑色
        // 移除旧的红线
        const oldRedLine = document.getElementById('cannonMouseLine');
        if (oldRedLine) {
            oldRedLine.remove();
        }
        
        // 创建黑色炮筒部分（下面1/3）
        let cannonLine = document.getElementById('cannonLine');
        if (!cannonLine) {
            cannonLine = document.createElement('div');
            cannonLine.id = 'cannonLine';
            cannonLine.style.position = 'fixed';
            cannonLine.style.height = '30px'; // 加粗到30像素
            cannonLine.style.background = 'linear-gradient(135deg, #444 0%, #666 50%, #444 100%)'; // 与炮台相同的渐变
            cannonLine.style.border = '2px solid #333'; // 与炮台相同的边框
            cannonLine.style.zIndex = '10'; // 降低z-index，确保炮台显示在上面
            cannonLine.style.pointerEvents = 'none';
            cannonLine.style.borderRadius = '0'; // 移除圆角，使炮筒上下都是平头
            document.body.appendChild(cannonLine);
        }
        
        // 创建红色激光部分（上面2/3）
        let laserLine = document.getElementById('laserLine');
        if (!laserLine) {
            laserLine = document.createElement('div');
            laserLine.id = 'laserLine';
            laserLine.style.position = 'fixed';
            laserLine.style.height = '2px'; // 红线保持不变
            laserLine.style.backgroundColor = 'red';
            laserLine.style.zIndex = '11'; // 激光显示在炮筒上面
            laserLine.style.pointerEvents = 'none';
            document.body.appendChild(laserLine);
        }
        
        // 计算线的长度和角度
        const lineLength = Math.sqrt(Math.pow(e.clientX - cannonBaseX, 2) + Math.pow(e.clientY - cannonBaseY, 2));
        const lineAngle = Math.atan2(e.clientY - cannonBaseY, e.clientX - cannonBaseX) * 180 / Math.PI;
        
        // 更新当前红线角度
        currentLineAngle = lineAngle;
        
        // 计算炮筒和激光的长度
        const cannonLength = 150; // 增加到150像素
        
        // 计算炮筒角度弧度
        const cannonAngleRad = lineAngle * Math.PI / 180;
        
        // 计算炮筒末端位置
        const cannonEndX = cannonBaseX + Math.cos(cannonAngleRad) * cannonLength;
        const cannonEndY = cannonBaseY + Math.sin(cannonAngleRad) * cannonLength;
        
        // 确保炮筒只显示在炮台上方
        let adjustedCannonLength = cannonLength;
        let showCannon = true;
        
        // 如果炮筒末端在炮台下方，调整炮筒长度
        if (cannonEndY > cannonBaseY) {
            // 计算炮筒与炮台底部的交点
            // 当y = cannonBaseY时，求解x
            // y = cannonBaseY + sin(angle) * length
            // 解方程：cannonBaseY = cannonBaseY + sin(angle) * length
            // sin(angle) * length = 0
            // 如果sin(angle) != 0，length = 0
            adjustedCannonLength = 0;
            showCannon = false;
        }
        
        // 计算激光长度
        const laserLength = Math.max(0, lineLength - adjustedCannonLength);
        
        // 移除旧的炮筒线条（如果存在）
        const oldCannonLine = document.getElementById('cannonLine');
        if (oldCannonLine) {
            oldCannonLine.remove();
        }
        
        // 移除旧的炮口加粗部分（如果存在）
        const oldMuzzleLine = document.getElementById('muzzleLine');
        if (oldMuzzleLine) {
            oldMuzzleLine.remove();
        }
        
        // 创建黑色炮筒部分（下面1/3）
        cannonLine = document.createElement('div');
        cannonLine.id = 'cannonLine';
        cannonLine.style.position = 'fixed';
        cannonLine.style.height = '30px'; // 加粗到30像素
        cannonLine.style.background = 'linear-gradient(135deg, #444 0%, #666 50%, #444 100%)'; // 与炮台相同的渐变
        cannonLine.style.border = '2px solid #333'; // 与炮台相同的边框
        cannonLine.style.zIndex = '10'; // 降低z-index，确保炮台显示在上面
        cannonLine.style.pointerEvents = 'none';
        cannonLine.style.borderRadius = '0'; // 移除圆角，使炮筒上下都是平头
        document.body.appendChild(cannonLine);
        
        // 设置炮筒部分（黑色）
        cannonLine.style.width = `${adjustedCannonLength}px`;
        cannonLine.style.left = `${cannonBaseX}px`;
        cannonLine.style.top = `${cannonBaseY - 15}px`; // 调整垂直位置，使线条居中
        cannonLine.style.transformOrigin = '0 50%';
        cannonLine.style.transform = `rotate(${lineAngle}deg)`;
        cannonLine.style.display = showCannon ? 'block' : 'none';
        
        // 创建炮口加粗部分
        if (showCannon && adjustedCannonLength >= 30) {
            const muzzleLine = document.createElement('div');
            muzzleLine.id = 'muzzleLine';
            muzzleLine.style.position = 'fixed';
            muzzleLine.style.height = '50px'; // 比炮筒粗20px（左右各10px）
            muzzleLine.style.background = 'linear-gradient(135deg, #444 0%, #666 50%, #444 100%)'; // 与炮台相同的渐变
            muzzleLine.style.border = '2px solid #333'; // 与炮台相同的边框
            muzzleLine.style.zIndex = '11'; // 高于炮筒主体，显示在外面
            muzzleLine.style.pointerEvents = 'none';
            muzzleLine.style.borderRadius = '0'; // 移除圆角，使炮筒上下都是平头
            
            // 计算炮口加粗部分的起始位置（从炮筒末端向前30像素）
            const muzzleStartX = cannonBaseX + Math.cos(cannonAngleRad) * (adjustedCannonLength - 30);
            const muzzleStartY = cannonBaseY + Math.sin(cannonAngleRad) * (adjustedCannonLength - 30);
            
            muzzleLine.style.width = '30px'; // 炮口长度30像素
            muzzleLine.style.left = `${muzzleStartX}px`;
            muzzleLine.style.top = `${muzzleStartY - 25}px`; // 调整垂直位置，使线条居中
            muzzleLine.style.transformOrigin = '0 50%';
            muzzleLine.style.transform = `rotate(${lineAngle}deg)`;
            
            document.body.appendChild(muzzleLine);
        }
        
        // 设置激光部分（红色）
        if (laserLength > 0 && showCannon) { // 只在炮筒显示时显示激光
            // 计算激光起点（炮筒末端）
            const laserStartX = cannonBaseX + Math.cos(cannonAngleRad) * adjustedCannonLength;
            const laserStartY = cannonBaseY + Math.sin(cannonAngleRad) * adjustedCannonLength;
            
            laserLine.style.width = `${laserLength}px`;
            laserLine.style.left = `${laserStartX}px`;
            laserLine.style.top = `${laserStartY - 1}px`; // 调整垂直位置，使线条居中
            laserLine.style.transformOrigin = '0 50%';
            laserLine.style.transform = `rotate(${lineAngle}deg)`;
            laserLine.style.display = 'none'; // 隐藏红线
        } else {
            laserLine.style.display = 'none';
        }
        
        // 隐藏红点标记鼠标位置
        const existingRedDot = document.getElementById('mouseRedDot');
        if (existingRedDot) {
            existingRedDot.remove();
        }
    });
    
    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // 说明书功能
    const manualBtn = document.getElementById('manualBtn');
    const manualModal = document.getElementById('manualModal');
    const closeManualBtn = document.getElementById('closeManualBtn');
    
    if (manualBtn && manualModal && closeManualBtn) {
        manualBtn.addEventListener('click', () => {
            manualModal.classList.add('show');
        });
        
        closeManualBtn.addEventListener('click', () => {
            manualModal.classList.remove('show');
        });
        
        // 点击弹窗外部关闭
        manualModal.addEventListener('click', (e) => {
            if (e.target === manualModal) {
                manualModal.classList.remove('show');
            }
        });
    }
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
    
    // 获取游戏区域的位置
    const gameAreaRect = gameArea.getBoundingClientRect();
    
    // 计算红黑线交界处的位置（炮筒末端）
    const cannonSection = document.querySelector('.cannon-section');
    const cannonRect = cannonSection.getBoundingClientRect();
    const cannonBaseX = cannonRect.left + cannonRect.width / 2;
    const cannonBaseY = cannonRect.bottom;
    
    // 炮筒长度（与模拟炮筒相同）
    const cannonLength = 150;
    
    // 使用当前红线的角度（发射时的角度）
    const angleRad = currentLineAngle * Math.PI / 180;
    
    // 计算炮筒末端位置（红黑线交界处）
    const cannonEndX = cannonBaseX + Math.cos(angleRad) * cannonLength;
    const cannonEndY = cannonBaseY + Math.sin(angleRad) * cannonLength;
    
    // 计算相对于游戏区域的位置
    const startX = cannonEndX - gameAreaRect.left;
    const startY = cannonEndY - gameAreaRect.top;
    
    // 设置炮弹初始位置（居中）
    bullet.style.left = (startX - 7.5) + 'px';
    bullet.style.top = (startY - 7.5) + 'px';
    
    gameArea.appendChild(bullet);
    
    // 计算飞行方向（沿着红线方向）
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
        
        // 收集所有被击中的蚊子
        const hitMosquitoes = [];
        gameState.mosquitoes.forEach(m => {
            const mosquitoRect = m.element.getBoundingClientRect();
            
            // 简单的碰撞检测
            if (bulletRect.left < mosquitoRect.right &&
                bulletRect.right > mosquitoRect.left &&
                bulletRect.top < mosquitoRect.bottom &&
                bulletRect.bottom > mosquitoRect.top) {
                
                hitMosquitoes.push(m);
            }
        });
        
        // 如果击中多个蚊子，随机选择一个
        if (hitMosquitoes.length > 0) {
            hit = true;
            hitMosquito = hitMosquitoes[Math.floor(Math.random() * hitMosquitoes.length)];
            
            // 处理被击中的蚊子
            const m = hitMosquito;
            
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
    // 防止重复调用
    if (gameOverModal.style.display === 'flex') {
        return;
    }
    
    // 记录游戏结束原因
    gameState.gameOverReason = reason;
    
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
    const restartButton = document.querySelector('#gameOverModal .modal-content button');
    
    if (reason === 'lose') {
        // 血量为空的情况
        if (gameOverText) gameOverText.textContent = '游戏结束';
        if (gameOverMessage) gameOverMessage.textContent = '是否重新再来？';
        if (restartButton) restartButton.textContent = '重新开始';
    } else {
        // 消灭所有蚊子的情况
        if (gameOverText) gameOverText.textContent = '恭喜！全部消灭！';
        if (gameOverMessage) gameOverMessage.textContent = '点击按钮进入下一关';
        if (restartButton) restartButton.textContent = '进入下一关';
    }
    
    // 重置游戏状态（除了最高分）
    if (reason === 'lose') {
        // 血量为空的情况，重置为第一轮
        gameState.level = 1;
        gameState.score = 0;
        gameState.playerHealth = gameState.maxPlayerHealth; // 血条空了才补满
    } else {
        // 消灭所有蚊子的情况，进入下一轮
        gameState.level += 1;
        // 保留当前血量，不补满
    }
    gameState.power = 50;
    gameState.cannonAngle = -90;
    updateScore();
    updatePlayerHealth();
    updatePowerBar();
    if (cannonBarrel) {
        cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
    }
    
    // 预加载下一轮的图片（边玩边加载）
    if (reason !== 'lose') {
        const nextLevel = gameState.level;
        loadLevelImages(nextLevel).then(() => {
            console.log('Preloaded images for level', nextLevel);
        }).catch(error => {
            console.warn('Error preloading images for next level:', error);
        });
    }
}

// 重新开始游戏
async function restartGame() {
    gameOverModal.style.display = 'none';
    // 重置游戏状态（保持level不变，因为showGameOver已经设置了正确的level）
    gameState.cannonAngle = -90;
    // 只有血条空了才补满血量，正常过关时保持当前血量
    if (gameState.gameOverReason === 'lose') {
        gameState.playerHealth = gameState.maxPlayerHealth; // 恢复血量
    }
    gameState.power = 50; // 重置电力
    gameState.energy = 100; // 重置能量
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
    updatePowerBar();
    updateEnergyBar();
    updateLevel();
    updateScore();
    updatePlayerHealth();
    
    // 重置激光瞄准线变量
    laserActive = false;
    if (laserLine) {
        laserLine = null;
    }
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    // 重置双击检测的时间戳
    lastTapTime = Date.now();
    lastFireTime = Date.now();
    
    // 显示加载界面
    if (loadingModal) {
        loadingModal.style.display = 'flex';
    }
    
    try {
        // 预加载当前轮次的图片
        await loadLevelImages(gameState.level);
        console.log('Images loaded successfully for level', gameState.level);
    } catch (error) {
        console.warn('Error loading images:', error);
    } finally {
        // 隐藏加载界面
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }
    
    updateBackground();
    
    // 清除所有轨迹线
    while (trailSvg.firstChild) {
        trailSvg.removeChild(trailSvg.firstChild);
    }
    
    // 无论是过关还是失败，都直接开始游戏，不再显示准备界面
    // 直接生成蚊子
    spawnMosquitoes();
    startMosquitoMovement(); // 添加这行，确保蚊子开始移动
    // 重新开始电力自动增长
    startPowerCharging();
    // 重新开始背景音乐
    bgmStarted = true;
    resumeBGM();
}

// 显示准备界面
function showReadyModal() {
    // 创建准备界面
    const readyModal = document.createElement('div');
    readyModal.id = 'readyModal';
    readyModal.className = 'game-over-modal';
    readyModal.style.display = 'flex';
    readyModal.innerHTML = `
        <div class="modal-content">
            <h2>第 ${gameState.level} 关</h2>
            <p>点击开始游戏</p>
            <button class="restart-btn" id="startLevelBtn">开始</button>
        </div>
    `;
    document.body.appendChild(readyModal);
    
    // 绑定开始按钮事件
    document.getElementById('startLevelBtn').addEventListener('click', () => {
        readyModal.remove();
        spawnMosquitoes();
        startMosquitoMovement(); // 添加这行，确保蚊子开始移动
        // 重新开始电力自动增长
        startPowerCharging();
        // 重新开始背景音乐
        bgmStarted = true;
        resumeBGM();
    });
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
        // 移除对透明度的检查，允许锁定隐身的蚊子
        // if (mosquito.element.style.opacity === '0') return;
        
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

// 找出离点击位置最近的蚊子
function findClosestMosquitoToPoint(point) {
    let closestMosquito = null;
    let minDistance = Infinity;
    
    console.log('开始查找离点击位置最近的蚊子，点击位置:', point.x, point.y);
    
    gameState.mosquitoes.forEach(mosquito => {
        // 移除对透明度的检查，允许锁定隐身的蚊子
        // if (mosquito.element.style.opacity === '0') return;
        
        const rect = mosquito.element.getBoundingClientRect();
        const mosquitoPos = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        const dx = mosquitoPos.x - point.x;
        const dy = mosquitoPos.y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        console.log('蚊子ID:', mosquito.id, '坐标:', mosquitoPos.x, mosquitoPos.y, '距离:', distance.toFixed(2));
        
        if (distance < minDistance) {
            minDistance = distance;
            closestMosquito = mosquito;
            console.log('更新最近蚊子:', mosquito.id, '距离:', minDistance.toFixed(2));
        }
    });
    
    console.log('最终找到的最近蚊子:', closestMosquito ? closestMosquito.id : '无', '最小距离:', minDistance.toFixed(2));
    
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
        if (!target) {
            clearInterval(flyInterval);
            missile.remove();
            return;
        }
        
        // 获取目标蚊子位置
        const targetRect = target.element.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;
        
        // 计算目标方向
        let dx = targetX - currentX;
        let dy = targetY - currentY;
        let targetAngle = Math.atan2(dy, dx);
        
        // 避开非目标蚊子
        let avoidanceAngle = 0;
        let avoidanceStrength = 0.2;
        
        gameState.mosquitoes.forEach(mosquito => {
            if (mosquito === target) return;
            
            const mosquitoRect = mosquito.element.getBoundingClientRect();
            const mosquitoX = mosquitoRect.left + mosquitoRect.width / 2;
            const mosquitoY = mosquitoRect.top + mosquitoRect.height / 2;
            
            // 计算与非目标蚊子的距离
            const distX = mosquitoX - currentX;
            const distY = mosquitoY - currentY;
            const distance = Math.sqrt(distX * distX + distY * distY);
            
            // 如果距离小于阈值，计算避开角度
            if (distance < 50) {
                const avoidanceDist = 50 - distance;
                const avoidAngle = Math.atan2(distY, distX) + Math.PI; // 相反方向
                avoidanceAngle += Math.sin(avoidAngle) * (avoidanceDist / 50) * avoidanceStrength;
            }
        });
        
        // 应用避开角度
        targetAngle += avoidanceAngle;
        
        // 平滑调整角度
        angle += (targetAngle - angle) * turningRate;
        
        // 更新位置
        currentX += Math.cos(angle) * speed;
        currentY += Math.sin(angle) * speed;
        
        // 更新追踪弹位置和角度
        missile.style.left = currentX + 'px';
        missile.style.top = currentY + 'px';
        missile.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
        
        // 检查与目标蚊子的碰撞
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

// 窗口大小改变时重新初始化画布和雷达尺寸
window.addEventListener('resize', () => {
    initCanvas();
    updateRadarSize();
});

// 启动游戏
window.addEventListener('load', () => {
    setTimeout(() => {
        init();
    }, 100);
});
