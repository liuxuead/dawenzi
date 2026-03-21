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
    highScore: parseInt(localStorage.getItem('highScore')) || 0
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

// 初始化
function init() {
    console.log('Game init started');
    initCanvas();
    updatePowerBar();
    updatePlayerHealth();
    updateLevel();
    updateScore();
    spawnMosquitoes();
    startMosquitoMovement();
    bindEvents();
    initBGM();
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
}

// 生成蚊子
function spawnMosquitoes() {
    const count = 5;
    gameArea.innerHTML = '';
    gameState.mosquitoes = [];
    
    for (let i = 0; i < count; i++) {
        const mosquito = document.createElement('div');
        mosquito.className = 'mosquito';
        
        // 所有蚊子都使用图片，不显示黑球背景
        mosquito.classList.add('mosquito-image-only');
        
        mosquito.style.left = Math.random() * 80 + 10 + '%';
        mosquito.style.top = Math.random() * 60 + 10 + '%';
        
        // 添加图片
        const img = document.createElement('img');
        img.className = 'mosquito-image';
        img.src = `wenzi${i + 1}.png`;
        img.alt = `蚊子${i + 1}`;
        mosquito.appendChild(img);
        
        gameArea.appendChild(mosquito);
        
        // 蚊子属性配置
        let mosquitoData = {
            element: mosquito,
            id: i + 1,
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
        
        // 根据编号设置属性
        switch (i + 1) {
            case 1:
                // 1号蚊子：快速飞行
                mosquitoData.properties.speed = 2;
                mosquitoData.vx *= 2;
                mosquitoData.vy *= 2;
                break;
            case 2:
                // 2号蚊子：分身能力，尺寸2倍
                mosquitoData.properties.clone = true;
                mosquitoData.properties.hasCloned = false;
                mosquitoData.properties.cloneInterval = 2000;
                mosquito.style.transform = 'scale(2)';
                break;
            case 3:
                // 3号蚊子：带血条
                mosquitoData.properties.health = true;
                mosquitoData.properties.maxHealth = 100;
                mosquitoData.properties.currentHealth = 100;
                addHealthBar(mosquito, 100);
                break;
            case 4:
                // 4号蚊子：加血能力，尺寸1.5倍
                mosquitoData.properties.heal = true;
                mosquitoData.properties.healInterval = 2000;
                mosquito.style.transform = 'scale(1.5)';
                break;
            case 5:
                // 5号蚊子：无属性
                break;
        }
        
        gameState.mosquitoes.push(mosquitoData);
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
    
    // 克隆蚊子数据
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
            currentHealth: targetMosquito.properties.maxHealth || 100
        }
    };
    
    // 如果是1号蚊子，速度翻倍
    if (targetMosquito.id === 1) {
        cloneData.vx *= 2;
        cloneData.vy *= 2;
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

// 点击时间记录
let lastClickTime = 0;
let bgmStarted = false;
let lastFireTime = 0;

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
    if (gameState.power < gameState.maxPower * 0.05) {
        // 暂停背景音乐，播放没子弹音效
        pauseBGM();
        meizidanSound.currentTime = 0;
        meizidanSound.play();
        // 音效结束后恢复背景音乐
        meizidanSound.onended = resumeBGM;
        return;
    }
    
    // 发射时震动
    vibrate(150);
    
    // 消耗电力（5%）
    gameState.power = Math.max(0, gameState.power - gameState.maxPower * 0.05);
    updatePowerBar();
    
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
function showGameOver() {
    gameOverModal.style.display = 'flex';
    // 停止背景音乐
    pauseBGM();
    bgmStarted = false;
    // 保存最高分数
    saveHighScore();
}

// 重新开始游戏
function restartGame() {
    gameOverModal.style.display = 'none';
    gameState.power = gameState.maxPower;
    gameState.cannonAngle = -90;
    gameState.level++; // 等级提升
    gameState.playerHealth = gameState.maxPlayerHealth; // 恢复血量
    cannonBarrel.style.transform = `rotate(${gameState.cannonAngle}deg)`;
    updatePowerBar();
    updateLevel();
    updatePlayerHealth();
    spawnMosquitoes();
    
    // 清除所有轨迹线
    while (trailSvg.firstChild) {
        trailSvg.removeChild(trailSvg.firstChild);
    }
    
    // 重新开始背景音乐
    bgmStarted = true;
    resumeBGM();
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
