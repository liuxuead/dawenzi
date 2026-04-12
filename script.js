

// 避开模式
let avoidFingerMode = false;
// 避免在页面加载完成前获取按钮元素
// const avoidModeBtn = document.getElementById('avoid-mode-btn');

// 切换避开模式
function toggleAvoidMode() {
    avoidFingerMode = !avoidFingerMode;
    // 直接获取按钮元素，确保每次都能找到最新的DOM元素
    const btn = document.querySelector('.avoid-mode-btn');
    if (btn) {
        if (avoidFingerMode) {
            btn.innerHTML = '避开模式: 开启<br>Avoid Mode: On';
            btn.classList.add('active');
        } else {
            btn.innerHTML = '避开模式: 关闭<br>Avoid Mode: Off';
            btn.classList.remove('active');
        }
        console.log('避开模式:', avoidFingerMode ? '开启' : '关闭');
    } else {
        console.error('找不到避开模式按钮');
    }
}

// 为避开模式按钮添加触摸事件支持
function addAvoidModeButtonListeners() {
    // 使用类选择器获取按钮元素
    const btn = document.querySelector('.avoid-mode-btn');
    if (btn) {
        // 点击事件
        btn.addEventListener('click', toggleAvoidMode);
        // 触摸事件（移动端）
        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleAvoidMode();
        });
        console.log('避开模式按钮事件监听器已添加');
    } else {
        console.error('找不到避开模式按钮，无法添加事件监听器');
    }
}

// 页面加载完成后添加事件监听器
if (typeof window !== 'undefined') {
    window.addEventListener('load', addAvoidModeButtonListeners);
}

// 检查点是否在避开区域内
function isPointInAvoidArea(x, y) {
    console.log('避开区域检测开始:', { x, y, avoidFingerMode });
    if (!avoidFingerMode) {
        console.log('避开模式未开启，返回false');
        return false;
    }
    
    // 获取游戏容器高度，使用相对比例计算避开区域
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) {
        console.error('找不到游戏容器');
        return false;
    }
    
    const containerHeight = gameContainer.clientHeight;
    // 避开区域：y >= 容器高度的 60% (相当于之前的477在800高度的容器中)
    const avoidY = containerHeight * 0.6;
    const result = y >= avoidY;
    console.log('避开区域检测结果:', { x, y, containerHeight, avoidY, result });
    return result;
}

// 调整"中"的范围（长按压超过3秒后调用）
function adjustMiddleRange(touch) {
    console.log('adjustMiddleRange 开始执行，touch:', touch);
    
    let stats = getStatsAverage();
    console.log('stats:', stats);
    console.log('stats.top.y:', stats.top.y);
    console.log('stats.bottom.y:', stats.bottom.y);
    
    // 检查统计数据是否完整，如果不完整，使用当前的touchData
    if (stats.top.y === 0 || stats.bottom.y === 0) {
        console.log('统计数据不完整，使用当前touchData');
        stats = {
            top: { ...touchData.top },
            middle: { ...touchData.middle },
            bottom: { ...touchData.bottom }
        };
        
        // 如果touchData也不完整，返回
        if (stats.top.y === 0 || stats.bottom.y === 0) {
            console.log('当前touchData也不完整，无法调整');
            return;
        }
    }
    
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) {
        console.log('gameContainer 不存在');
        return;
    }
    
    const rect = gameContainer.getBoundingClientRect();
    const containerHeight = gameContainer.clientHeight;
    const originalX = touch.clientX - rect.left;
    const originalY = touch.clientY - rect.top;
    const mirrorX = originalX; // X坐标不需要镜像
    const mirrorY = containerHeight - originalY; // Y坐标镜像
    const relativeY = mirrorY;
    console.log('mirrorX:', mirrorX, 'mirrorY:', mirrorY);
    console.log('relativeY (镜像后):', relativeY);
    
    // 计算按压位置在统计范围内的位置 (0-1)
    let totalRange = Math.abs(stats.bottom.y - stats.top.y);
    console.log('totalRange:', totalRange);
    if (totalRange <= 0) {
        console.log('totalRange <= 0，使用默认范围 100');
        totalRange = 100; // 使用一个小的默认范围
    }
    
    // 确定哪个是上，哪个是下
    const minY = Math.min(stats.top.y, stats.bottom.y);
    const maxY = Math.max(stats.top.y, stats.bottom.y);
    
    let position;
    if (totalRange === 100) {
        // 如果使用了默认范围，直接使用相对位置的比例
        position = 0.5; // 默认在中间
    } else {
        position = (relativeY - minY) / totalRange;
        position = Math.max(0, Math.min(1, position));
    }
    console.log('position:', position);
    
    // 反转位置，让上下对应
    position = 1 - position;
    console.log('position (反转后):', position);
    
    // 记录"中"的数据：更新圆心位置为当前按压的位置
    // 使用镜像后的坐标
    touchData.middle.x = Math.round(mirrorX);
    touchData.middle.y = Math.round(mirrorY);
    touchData.middle.radius = 50;
    touchData.middle.width = 150;
    touchData.middle.height = 100;
    console.log('记录新的"中"的数据:', touchData.middle);
    
    // 更新数据显示
    updateDataDisplay();
    
    // 更新所有统计数据中的"中"的数据
    allTouchData.forEach(record => {
        record.middle.x = touchData.middle.x;
        record.middle.y = touchData.middle.y;
        record.middle.radius = touchData.middle.radius;
        record.middle.width = touchData.middle.width;
        record.middle.height = touchData.middle.height;
    });
    console.log('已更新所有统计数据中的"中"的数据');
    
    // 更新统计面板显示
    updateStatsPanel();
    
    // 根据按压位置调整"中"的范围
    // "中"至少占 50%
    const minMiddleRange = 0.5;
    
    if (position < 0.5) {
        // 中偏上，向上扩展
        middleRangeStart = Math.max(0.1, position - 0.25);
        middleRangeEnd = middleRangeStart + minMiddleRange;
        middleRangeEnd = Math.min(0.9, middleRangeEnd);
    } else {
        // 中偏下，向下扩展
        middleRangeEnd = Math.min(0.9, position + 0.25);
        middleRangeStart = middleRangeEnd - minMiddleRange;
        middleRangeStart = Math.max(0.1, middleRangeStart);
    }
    
    console.log('========================================');
    console.log('长按压超过3秒，调整"中"的范围');
    console.log('按压位置:', position.toFixed(2));
    console.log('新的"中"范围:', middleRangeStart.toFixed(2), '-', middleRangeEnd.toFixed(2));
    console.log('========================================');
}

// 判断触摸位置是否在绘制范围附近
function isNearDrawArea(mirrorX, mirrorY) {
    const stats = getStatsAverage();
    
    const areas = [
        stats.top,
        stats.middle,
        stats.bottom
    ];
    
    const distanceThreshold = 100; // 100像素范围内
    
    for (const area of areas) {
        if (area.x === 0 && area.y === 0) {
            continue; // 跳过未记录的区域
        }
        
        // 计算到区域中心的距离
        const dx = mirrorX - area.x;
        const dy = mirrorY - area.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 只有距离在100像素内才返回true
        if (distance <= distanceThreshold) {
            return true;
        }
    }
    
    return false;
}

// 更新仪表盘数值（平滑动画）
function updateDashboardValue() {
    const dashboardEl = document.querySelector('.dashboard-value');
    if (!dashboardEl) return;
    
    // 计算差值，平滑过渡
    const diff = targetDashboardValue - dashboardValue;
    if (Math.abs(diff) < 0.1) {
        // 差值很小，直接设置
        dashboardValue = targetDashboardValue;
        dashboardEl.textContent = Math.round(dashboardValue);
        dashboardAnimationId = null;
        
        // 更新车道线速度
        updateLaneSpeed(dashboardValue);
        
        // 检查是否需要启动计时器
        if (Math.round(dashboardValue) > 0 && !timerStarted) {
            timerStarted = true;
            timerPaused = false;
            roundStartTime = Date.now(); // 重置开始时间
            console.log('黄色小球速度大于0，开始计时');
        }
        
        return;
    }
    
    // 快速平滑过渡（每次移动差值的20%）
    dashboardValue += diff * 0.2;
    dashboardEl.textContent = Math.round(dashboardValue);
    
    // 更新车道线速度
    updateLaneSpeed(dashboardValue);
    
    // 检查是否需要启动计时器
    if (Math.round(dashboardValue) > 0 && !timerStarted) {
        timerStarted = true;
        timerPaused = false;
        roundStartTime = Date.now(); // 重置开始时间
        console.log('黄色小球速度大于0，开始计时');
    }
    
    // 继续动画
    dashboardAnimationId = requestAnimationFrame(updateDashboardValue);
}

// 更新车道线速度
function updateLaneSpeed(speed) {
    const topTopLane = document.getElementById('top-top-lane');
    const topLane = document.getElementById('top-lane');
    const bottomLane = document.getElementById('bottom-lane');
    const bottomBottomLane = document.getElementById('bottom-bottom-lane');
    
    const lanes = [topTopLane, topLane, bottomLane, bottomBottomLane];
    
    if (lanes.every(lane => !lane)) return;
    
    // 根据速度计算动画持续时间（速度越快，持续时间越短）
    // 速度0-30，对应持续时间0.2s-0.02s
    const maxSpeed = 30;
    const minDuration = 0.02;
    const maxDuration = 0.2;
    
    const duration = maxDuration - (speed / maxSpeed) * (maxDuration - minDuration);
    
    lanes.forEach(lane => {
        if (!lane) return;
        lane.style.animationDuration = `${duration}s`;
        
        // 根据速度添加视觉效果
            lane.classList.remove('high-speed', 'very-high-speed', 'extreme-speed');
            
            if (speed > 5) {
                lane.classList.add('high-speed');
            }
            
            if (speed > 15) {
                lane.classList.add('very-high-speed');
            }
            
            if (speed > 25) {
                lane.classList.add('extreme-speed');
            }
    });
}

// 使用指定的持续时间更新车道线
function updateLaneSpeedWithDuration(duration, speed) {
    const topTopLane = document.getElementById('top-top-lane');
    const topLane = document.getElementById('top-lane');
    const bottomLane = document.getElementById('bottom-lane');
    const bottomBottomLane = document.getElementById('bottom-bottom-lane');
    
    const lanes = [topTopLane, topLane, bottomLane, bottomBottomLane];
    
    lanes.forEach(lane => {
        if (!lane) return;
        
        lane.style.animationDuration = `${duration}s`;
        
        // 根据速度添加视觉效果
        lane.classList.remove('high-speed', 'very-high-speed', 'extreme-speed');
        
        if (speed > 100) {
            lane.classList.add('high-speed');
        }
        
        if (speed > 180) {
            lane.classList.add('very-high-speed');
        }
        
        if (speed > 250) {
            lane.classList.add('extreme-speed');
        }
    });
}

// 持续更新车道线（即使速度稳定时也能保持运动）
let lastSpeed = 0;
let currentDuration = 0.2; // 当前动画持续时间
let targetDuration = 0.2; // 目标动画持续时间

function continuousLaneUpdate() {
    // 只在速度真正变化时才更新车道线动画
    if (Math.abs(dashboardValue - lastSpeed) > 0.1) {
        // 计算目标动画持续时间
        const maxSpeed = 30;
        const minDuration = 0.02;
        const maxDuration = 0.2;
        targetDuration = maxDuration - (dashboardValue / maxSpeed) * (maxDuration - minDuration);
        lastSpeed = dashboardValue;
    }
    
    // 平滑过渡动画持续时间
    if (Math.abs(currentDuration - targetDuration) > 0.01) {
        currentDuration += (targetDuration - currentDuration) * 0.1;
        updateLaneSpeedWithDuration(currentDuration, dashboardValue);
    }
    
    requestAnimationFrame(continuousLaneUpdate);
}

// 根据触摸位置计算仪表盘数值
function calculateDashboardValue(mirrorY) {
    const stats = getStatsAverage();
    
    if (stats.top.y === 0 || stats.bottom.y === 0) {
        return DASHBOARD_MAX_VALUE / 2; // 默认中间值
    }
    
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) return DASHBOARD_MAX_VALUE / 2;
    
    const rect = gameContainer.getBoundingClientRect();
    // 把mirrorY转换成相对于game-container的坐标
    const relativeY = mirrorY - rect.top;
    
    // 计算当前Y在统计范围内的位置 (0-1)
    let totalRange = Math.abs(stats.bottom.y - stats.top.y);
    if (totalRange <= 0) {
        return DASHBOARD_MAX_VALUE / 2; // 默认中间值
    }
    
    // 确定哪个是上，哪个是下
    const minY = Math.min(stats.top.y, stats.bottom.y);
    const maxY = Math.max(stats.top.y, stats.bottom.y);
    
    let position = (relativeY - minY) / totalRange;
    position = Math.max(0, Math.min(1, position));
    
    // 直接返回计算值：下方position=0时返回0，上方position=1时返回300
    let rawValue = position * DASHBOARD_MAX_VALUE;
    
    // 数值锁定到稳定点
    rawValue = lockToStablePoints(rawValue);
    
    return rawValue;
}

// 稳定点列表
const STABLE_POINTS = [40, 60, 80, 100, 110, 120, 150, 210, 220];
const STABLE_POINT_TOLERANCE = 5; // 容错范围

// 锁定到稳定点
function lockToStablePoints(value) {
    for (const point of STABLE_POINTS) {
        if (Math.abs(value - point) <= STABLE_POINT_TOLERANCE) {
            return point;
        }
    }
    return value;
}

// 游戏初始化
function initGame() {
    console.log('游戏初始化完成');
    
    
    // 初始化仪表盘显示0
    dashboardValue = 0;
    targetDashboardValue = 0;
    const dashboardEl = document.querySelector('.dashboard-value');
    if (dashboardEl) {
        dashboardEl.textContent = '0';
    }
    
    // 上中下按钮事件
    const btnTop = document.getElementById('btn-top');
    const btnMiddle = document.getElementById('btn-middle');
    const btnBottom = document.getElementById('btn-bottom');
    const textTop = document.getElementById('text-top');
    const textMiddle = document.getElementById('text-middle');
    const textBottom = document.getElementById('text-bottom');
    const touchAreaTop = document.querySelector('.touch-area-top');
    const touchAreaMiddle = document.querySelector('.touch-area-middle');
    const touchAreaBottom = document.querySelector('.touch-area-bottom');
    
    if (btnTop) {
        btnTop.onclick = function() {
            console.log('点击了上按钮');
            showStatsTouchArea('top', touchAreaTop, touchAreaMiddle, touchAreaBottom);
            updateStatsDisplayText('top', textTop, textMiddle, textBottom);
        };
    }
    if (btnMiddle) {
        btnMiddle.onclick = function() {
            console.log('点击了中按钮');
            showStatsTouchArea('middle', touchAreaTop, touchAreaMiddle, touchAreaBottom);
            updateStatsDisplayText('middle', textTop, textMiddle, textBottom);
        };
    }
    if (btnBottom) {
        btnBottom.onclick = function() {
            console.log('点击了下按钮');
            showStatsTouchArea('bottom', touchAreaTop, touchAreaMiddle, touchAreaBottom);
            updateStatsDisplayText('bottom', textTop, textMiddle, textBottom);
        };
    }
    
    // 重置统计按钮事件 - 只清空统计数据，不清空当前记录
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.onclick = function() {
            console.log('点击了重置统计按钮');
            // 只清空统计数据
            allTouchData.length = 0; // 清空统计数据
            lastBottomX = 0;
            lastBottomY = 0;
            
            // 重置"中"范围调整状态
            middleRangeAdjusted = false;
            middleRangeStart = 0.33;
            middleRangeEnd = 0.66;
            
            // 清除保存的统计数据
            clearSavedData();
            
            // 更新统计面板为0
            updateStatsPanel();
            
            // 重置仪表盘显示0
            dashboardValue = 0;
            targetDashboardValue = 0;
            const dashboardEl = document.querySelector('.dashboard-value');
            if (dashboardEl) {
                dashboardEl.textContent = '0';
            }
            
            console.log('统计数据已重置为0');
        };
    }
    
    // 重置记录按钮事件
    const resetRecordBtn = document.getElementById('reset-record-btn');
    if (resetRecordBtn) {
        resetRecordBtn.onclick = function() {
            console.log('点击了重置记录按钮');
            // 重置所有数据
            touchData.top.x = 0;
            touchData.top.y = 0;
            touchData.middle.x = 0;
            touchData.middle.y = 0;
            touchData.bottom.x = 0;
            touchData.bottom.y = 0;
            touchCount = 0;
            lastBottomX = 0;
            lastBottomY = 0;
            allTouchData.length = 0; // 清空统计数据
            completeCount = 0;
            
            // 重置"中"范围调整状态
            middleRangeAdjusted = false;
            middleRangeStart = 0.33;
            middleRangeEnd = 0.66;
            
            // 清除保存的统计数据
            clearSavedData();
            
            // 清除显示
            clearTouchAreas(touchAreaTop, touchAreaMiddle, touchAreaBottom);
            clearDisplayText(textTop, textMiddle, textBottom);
            updateDataDisplay();
            updateStatsPanel();
            
            // 更新完成计数器
            const completeCounter = document.getElementById('complete-counter');
            completeCounter.textContent = completeCount;
            
            // 重置仪表盘显示0
            dashboardValue = 0;
            targetDashboardValue = 0;
            const dashboardEl = document.querySelector('.dashboard-value');
            if (dashboardEl) {
                dashboardEl.textContent = '0';
            }
            
            console.log('所有数据已重置，可以重新开始记录');
        };
    }
    
    // 尝试加载保存的数据
    const loaded = loadSavedData();
    if (loaded) {
        console.log('已加载保存的数据，跳过初始化');
    } else {
        // 没有保存的数据，使用默认初始化数据
        console.log('没有保存的数据，使用默认初始化数据');
        
        // 加载默认数据
        completeCount = DEFAULT_GAME_DATA.completeCount;
        touchData.bottom = { ...DEFAULT_GAME_DATA.touchData.bottom };
        touchData.middle = { ...DEFAULT_GAME_DATA.touchData.middle };
        touchData.top = { ...DEFAULT_GAME_DATA.touchData.top };
        middleRangeAdjusted = DEFAULT_GAME_DATA.middleRangeAdjusted;
        middleRangeStart = DEFAULT_GAME_DATA.middleRangeStart;
        middleRangeEnd = DEFAULT_GAME_DATA.middleRangeEnd;
        
        // 加载 allTouchData
        allTouchData.length = 0;
        DEFAULT_GAME_DATA.allTouchData.forEach(record => {
            allTouchData.push(record);
        });
        
        // 更新UI
        const completeCounter = document.getElementById('complete-counter');
        if (completeCounter) {
            completeCounter.textContent = completeCount;
        }
        
        // 更新统计面板
        updateStatsPanel();
        updateDataDisplay();
        
        console.log('默认数据已加载，completeCount:', completeCount);
    }
    
    setupTouchListeners();
    setupDashboardListeners();
    initControlBallLongPress();
    // 初始化背景文字
    updatePressAreaHint();
    startStopwatch();
    // 初始化数据显示
    updateDataDisplay();
    
    // 自适应正方形框 - 大小随浏览器窗口变化，位置固定
    function updateDynamicFrameSize() {
        const frame = document.getElementById('dynamic-frame');
        if (!frame) return;
        
        // 将框设置为整个屏幕大小
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        frame.style.left = '0px';
        frame.style.top = '0px';
        frame.style.transform = 'none';
        frame.style.width = `${windowWidth}px`;
        frame.style.height = `${windowHeight}px`;
    }
    
    // 初始化框大小
    updateDynamicFrameSize();
    
    // 页面加载时立即绘制按压区域
    drawPressAreas();
    
    // 监听窗口大小变化，更新框的大小和绘制区域
    window.addEventListener('resize', () => {
        updateDynamicFrameSize();
        drawPressAreas();
    });
    
    // 控制球相关变量
    let ballX = 0; // 球的X坐标（相对于框）
    let ballY = 0; // 球的Y坐标（相对于框）
    let ballSpeedX = 0; // 球的X方向速度
    let ballSpeedY = 0; // 球的Y方向速度
    let touchDirectionX = 0; // 触摸方向X
    let touchDirectionY = 0; // 触摸方向Y
    
    // 球移动参数
    const BALL_SPEED_FACTOR = 1.5; // 速度因子，调大可以使球移动更快，调小则更慢
    const MAX_BALL_SPEED = 20; // 球的最大速度
    const BALL_ACCELERATION = 0.5; // 球的加速度
    const BALL_DECELERATION = 0.9; // 球的减速系数
    
    // 初始化球的位置（屏幕中间）
    function initBallPosition() {
        const frame = document.getElementById('dynamic-frame');
        const ball = document.getElementById('control-ball');
        if (!frame || !ball) return;
        
        const frameRect = frame.getBoundingClientRect();
        const ballSize = 40; // 球的大小
        
        // 初始位置：屏幕中间
        ballX = (frameRect.width - ballSize) / 2;
        ballY = (frameRect.height - ballSize) / 2;
        
        updateBallPosition();
    }
    
    // 更新球的位置
    function updateBallPosition() {
        const ball = document.getElementById('control-ball');
        if (!ball) return;
        
        ball.style.left = `${ballX}px`;
        ball.style.top = `${ballY}px`;
    }
    
    // 更新激活的箭头
    function updateActiveArrows(directionX, directionY) {
        // 获取所有箭头元素
        const arrowUp = document.getElementById('arrow-up');
        const arrowDown = document.getElementById('arrow-down');
        const arrowLeft = document.getElementById('arrow-left');
        const arrowRight = document.getElementById('arrow-right');
        
        if (!arrowUp || !arrowDown || !arrowLeft || !arrowRight) return;
        
        // 先移除所有箭头的active类
        arrowUp.classList.remove('active');
        arrowDown.classList.remove('active');
        arrowLeft.classList.remove('active');
        arrowRight.classList.remove('active');
        
        // 根据方向激活对应箭头
        if (Math.abs(directionY) > Math.abs(directionX)) {
            // 垂直方向
            if (directionY < 0) {
                // 向上
                arrowUp.classList.add('active');
            } else {
                // 向下
                arrowDown.classList.add('active');
            }
        } else {
            // 水平方向
            if (directionX < 0) {
                // 向左
                arrowLeft.classList.add('active');
            } else {
                // 向右
                arrowRight.classList.add('active');
            }
        }
    }
    
    // 更新球的移动
    function updateBallMovement() {
        const frame = document.getElementById('dynamic-frame');
        if (!frame) return;
        
        const frameRect = frame.getBoundingClientRect();
        const ballSize = 40; // 球的大小
        
        // 根据仪表盘速度和触摸方向计算球的速度
        const targetSpeed = dashboardValue; // 目标速度，与仪表盘显示数值一致
        
        // 当没有方向输入且有速度时，随机选择方向
        if (Math.abs(touchDirectionX) < 0.1 && Math.abs(touchDirectionY) < 0.1 && targetSpeed > 1) {
            // 每100帧随机一次方向
            if (Math.random() < 0.01) {
                const angle = Math.random() * Math.PI * 2;
                touchDirectionX = Math.cos(angle);
                touchDirectionY = Math.sin(angle);
            }
        }
        
        // 应用加速度，目标速度与仪表盘数值一致
        const speedRatio = targetSpeed / 10; // 调整速度比例，使得10对应正常速度
        ballSpeedX += touchDirectionX * BALL_ACCELERATION * speedRatio;
        ballSpeedY += touchDirectionY * BALL_ACCELERATION * speedRatio;
        
        // 限制最大速度，与仪表盘数值一致
        const currentSpeed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
        const maxSpeed = targetSpeed;
        if (currentSpeed > maxSpeed) {
            const ratio = maxSpeed / currentSpeed;
            ballSpeedX *= ratio;
            ballSpeedY *= ratio;
        }
        
        // 应用减速
        ballSpeedX *= BALL_DECELERATION;
        ballSpeedY *= BALL_DECELERATION;
        
        // 计算新位置
        let newX = ballX + ballSpeedX * BALL_SPEED_FACTOR;
        let newY = ballY + ballSpeedY * BALL_SPEED_FACTOR;
        
        // 边界碰撞检测和处理
        let collided = false;
        
        // 移除仪表盘安全区域检测，让小黄球可以自由通过
        // 仪表盘的z-index已经设置为100，而小黄球的z-index为200，所以小黄球会显示在仪表盘上方
        
        // 左右边界
        if (newX < 0) {
            newX = 0;
            // 沿着边缘运动
            if (Math.abs(ballSpeedY) > 0.1) {
                // 保持Y方向速度，X方向速度设为0
                ballSpeedX = 0;
            } else {
                ballSpeedX = -ballSpeedX * 0.8; // 反弹
            }
            collided = true;
        } else if (newX > frameRect.width - ballSize) {
            newX = frameRect.width - ballSize;
            // 沿着边缘运动
            if (Math.abs(ballSpeedY) > 0.1) {
                // 保持Y方向速度，X方向速度设为0
                ballSpeedX = 0;
            } else {
                ballSpeedX = -ballSpeedX * 0.8; // 反弹
            }
            collided = true;
        }
        
        // 上下边界
        if (newY < 0) {
            newY = 0;
            // 沿着边缘运动
            if (Math.abs(ballSpeedX) > 0.1) {
                // 保持X方向速度，Y方向速度设为0
                ballSpeedY = 0;
            } else {
                ballSpeedY = -ballSpeedY * 0.8; // 反弹
            }
            collided = true;
        } else if (newY > frameRect.height - ballSize) {
            newY = frameRect.height - ballSize;
            // 沿着边缘运动
            if (Math.abs(ballSpeedX) > 0.1) {
                // 保持X方向速度，Y方向速度设为0
                ballSpeedY = 0;
            } else {
                ballSpeedY = -ballSpeedY * 0.8; // 反弹
            }
            collided = true;
        }
        
        // 更新位置
        ballX = newX;
        ballY = newY;
        
        updateBallPosition();
        
        requestAnimationFrame(updateBallMovement);
    }
    
    // 监听触摸事件来控制球的方向（支持多指触摸）
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        let speedTouchId = null; // 控制速度的手指ID
        let directionTouchId = null; // 控制方向的手指ID
        let lastDirectionTouchX = 0;
        let lastDirectionTouchY = 0;
        let lastTouchX = 0; // 记录上一次触摸位置
        let lastTouchY = 0;
        let touchStartTime = 0; // 记录触摸开始时间
        let touchStartX = 0; // 记录触摸开始位置
        let touchStartY = 0;
        
        gameContainer.addEventListener('touchstart', (e) => {
            const touches = e.touches;
            
            // 记录触摸开始信息
            if (touches.length === 1) {
                touchStartTime = Date.now();
                touchStartX = touches[0].clientX;
                touchStartY = touches[0].clientY;
                lastTouchX = touches[0].clientX;
                lastTouchY = touches[0].clientY;
            }
            
            // 第一个手指默认用于控制速度
            if (touches.length === 1 && !speedTouchId) {
                speedTouchId = touches[0].identifier;
            }
            
            // 第二个手指用于控制方向
            if (touches.length === 2 && !directionTouchId) {
                for (let i = 0; i < touches.length; i++) {
                    if (touches[i].identifier !== speedTouchId) {
                        directionTouchId = touches[i].identifier;
                        lastDirectionTouchX = touches[i].clientX;
                        lastDirectionTouchY = touches[i].clientY;
                        break;
                    }
                }
            }
        });
        
        gameContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touches = e.touches;
            
            // 单指触摸时，同时控制速度和方向
            if (touches.length === 1) {
                const touch = touches[0];
                const deltaX = touch.clientX - lastTouchX;
                const deltaY = touch.clientY - lastTouchY;
                
                // 计算触摸方向
                const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (length > 2) { // 提高灵敏度，避免微小移动
                    touchDirectionX = deltaX / length;
                    touchDirectionY = deltaY / length;
                    
                    // 激活对应方向的箭头
                    updateActiveArrows(touchDirectionX, touchDirectionY);
                }
                
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
            
            // 查找控制方向的手指（双指触摸）
            for (let i = 0; i < touches.length; i++) {
                if (touches[i].identifier === directionTouchId) {
                    const touch = touches[i];
                    const deltaX = touch.clientX - lastDirectionTouchX;
                    const deltaY = touch.clientY - lastDirectionTouchY;
                    
                    // 计算触摸方向
                    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    if (length > 2) { // 提高灵敏度，避免微小移动
                        touchDirectionX = deltaX / length;
                        touchDirectionY = deltaY / length;
                        
                        // 激活对应方向的箭头
                        updateActiveArrows(touchDirectionX, touchDirectionY);
                    }
                    
                    lastDirectionTouchX = touch.clientX;
                    lastDirectionTouchY = touch.clientY;
                    break;
                }
            }
        });
        
        gameContainer.addEventListener('touchend', (e) => {
            const touches = e.touches;
            
            // 计算双指动能
            if (touches.length === 0) {
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;
                const deltaX = touchStartX - lastTouchX;
                const deltaY = touchStartY - lastTouchY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // 如果触摸时间短且移动距离大，认为是双指动能（快速滑动）
                if (touchDuration < 300 && distance > 50) {
                    // 根据滑动方向增加动能
                    const kineticEnergy = Math.min(distance / 10, 5); // 限制最大动能
                    touchDirectionX = (deltaX / distance) * kineticEnergy;
                    touchDirectionY = (deltaY / distance) * kineticEnergy;
                    
                    // 激活对应方向的箭头
                    updateActiveArrows(touchDirectionX, touchDirectionY);
                }
            }
            
            // 检查控制方向的手指是否离开
            let directionTouchFound = false;
            for (let i = 0; i < touches.length; i++) {
                if (touches[i].identifier === directionTouchId) {
                    directionTouchFound = true;
                    break;
                }
            }
            
            if (!directionTouchFound) {
                directionTouchId = null;
                // 不重置方向，保持箭头亮着
                // touchDirectionX = 0;
                // touchDirectionY = 0;
            }
            
            // 检查控制速度的手指是否离开
            let speedTouchFound = false;
            for (let i = 0; i < touches.length; i++) {
                if (touches[i].identifier === speedTouchId) {
                    speedTouchFound = true;
                    break;
                }
            }
            
            if (!speedTouchFound) {
                speedTouchId = null;
                // 如果控制速度的手指离开，重新分配
                if (touches.length > 0) {
                    speedTouchId = touches[0].identifier;
                }
            }
        });
        
        // 鼠标事件（用于桌面测试）
        let isMouseDown = false;
        
        gameContainer.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            lastDirectionTouchX = e.clientX;
            lastDirectionTouchY = e.clientY;
        });
        
        gameContainer.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            const deltaX = e.clientX - lastDirectionTouchX;
            const deltaY = e.clientY - lastDirectionTouchY;
            
            // 计算触摸方向
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (length > 5) { // 避免微小移动
                touchDirectionX = deltaX / length;
                touchDirectionY = deltaY / length;
                
                // 激活对应方向的箭头
                updateActiveArrows(touchDirectionX, touchDirectionY);
            }
            
            lastDirectionTouchX = e.clientX;
            lastDirectionTouchY = e.clientY;
        });
        
        gameContainer.addEventListener('mouseup', () => {
            isMouseDown = false;
            // 不重置方向，保持箭头亮着
            // touchDirectionX = 0;
            // touchDirectionY = 0;
        });
        
        // 右键点击事件：设置速度为8
        gameContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // 阻止默认的右键菜单
            
            // 设置速度为8
            targetDashboardValue = 8;
            if (!dashboardAnimationId) {
                updateDashboardValue();
            }
            
            console.log('PC端右键点击，速度设置为8');
        });
    }
    
    // 小绿球相关变量
    const MAX_GREEN_BALLS = 5; // 最大小绿球数量
    const GREEN_BALL_SIZE = 30; // 小绿球大小
    
    // 小绿球速度等级配置
    const GREEN_BALL_SPEEDS = [
        { min: 2, max: 4, probability: 0.5 }, // 慢速
        { min: 5, max: 7, probability: 0.3 }, // 中速
        { min: 8, max: 10, probability: 0.2 }  // 快速
    ];
    
    // 生成小绿球
    function createGreenBall() {
        // 检查当前小绿球数量是否达到上限
        if (greenBalls.length >= MAX_GREEN_BALLS) {
            return;
        }
        
        // 随机选择速度等级
        let speedConfig = GREEN_BALL_SPEEDS[0];
        let random = Math.random();
        let cumulativeProbability = 0;
        
        for (const config of GREEN_BALL_SPEEDS) {
            cumulativeProbability += config.probability;
            if (random <= cumulativeProbability) {
                speedConfig = config;
                break;
            }
        }
        
        // 生成随机速度
        const speed = Math.floor(Math.random() * (speedConfig.max - speedConfig.min + 1)) + speedConfig.min;
        
        // 生成随机方向
        const angle = Math.random() * Math.PI * 2;
        const speedX = Math.cos(angle) * speed;
        const speedY = Math.sin(angle) * speed;
        
        // 创建小绿球元素
        const ball = document.createElement('div');
        ball.className = 'green-ball';
        
        // 创建速度文本元素
        const speedText = document.createElement('span');
        speedText.className = 'speed-text';
        speedText.textContent = speed;
        
        // 将文本元素添加到小球中
        ball.appendChild(speedText);
        
        // 设置随机位置（避开仪表盘）
        const frame = document.getElementById('dynamic-frame');
        const frameRect = frame.getBoundingClientRect();
        
        let ballX, ballY;
        let validPosition = false;
        
        // 确保小球不会生成在仪表盘中，且在避开模式下不会生成在避开区域内
        while (!validPosition) {
            ballX = Math.random() * (frameRect.width - GREEN_BALL_SIZE);
            ballY = Math.random() * (frameRect.height - GREEN_BALL_SIZE);
            
            // 仪表盘区域
            const dashboardLeft = 20;
            const dashboardTop = 40;
            const dashboardSize = 120;
            
            // 检查是否在仪表盘中
            const inDashboard = ballX < dashboardLeft + dashboardSize && ballY < dashboardTop + dashboardSize;
            
            // 检查是否在避开区域内
            const inAvoidArea = isPointInAvoidArea(ballX, ballY);
            
            if (!inDashboard && !inAvoidArea) {
                validPosition = true;
            }
        }
        
        ball.style.left = `${ballX}px`;
        ball.style.top = `${ballY}px`;
        
        // 添加到容器中
        frame.appendChild(ball);
        
        // 保存小球信息
        greenBalls.push({
            element: ball,
            x: ballX,
            y: ballY,
            speedX: speedX,
            speedY: speedY,
            speed: speed
        });
        
        console.log('生成小绿球，速度:', speed);
    }
    
    // 更新小绿球运动
    function updateGreenBalls() {
        const frame = document.getElementById('dynamic-frame');
        if (!frame) return;
        
        const frameRect = frame.getBoundingClientRect();
        
        // 在循环外部获取黄色小球，避免重复获取和作用域问题
        const yellowBall = document.getElementById('control-ball');
        let yellowBallX = 0, yellowBallY = 0, yellowBallSize = 40;
        if (yellowBall) {
            yellowBallX = parseFloat(yellowBall.style.left || '0');
            yellowBallY = parseFloat(yellowBall.style.top || '0');
        }
        
        // 关卡预测距离配置（在循环外部定义，避免重复定义）
        const levelPredictionDistance = {
            1: 0,
            2: 1/8,
            3: 1/4,
            4: 3/8,
            5: 1/2,
            6: 5/8,
            7: 3/4,
            8: 7/8,
            9: 9/10,
            10: 1
        };
        const predictionDistance = levelPredictionDistance[currentLevel] * frameRect.width;
        
        for (let i = greenBalls.length - 1; i >= 0; i--) {
            const ball = greenBalls[i];
            
            // 计算新位置
            let newX = ball.x + ball.speedX * 0.5;
            let newY = ball.y + ball.speedY * 0.5;
            
            // 边界碰撞检测
            if (newX < 0 || newX > frameRect.width - GREEN_BALL_SIZE) {
                ball.speedX = -ball.speedX;
                newX = Math.max(0, Math.min(frameRect.width - GREEN_BALL_SIZE, newX));
            }
            
            if (newY < 0 || newY > frameRect.height - GREEN_BALL_SIZE) {
                ball.speedY = -ball.speedY;
                newY = Math.max(0, Math.min(frameRect.height - GREEN_BALL_SIZE, newY));
            }
            
            // 避开区域碰撞检测
            if (isPointInAvoidArea(newX, newY)) {
                // 获取游戏容器高度，使用相对比例计算避开区域
                const gameContainer = document.querySelector('.game-container');
                if (gameContainer) {
                    const containerHeight = gameContainer.clientHeight;
                    const avoidY = containerHeight * 0.6;
                    // 反弹回避开区域外
                    ball.speedY = -Math.abs(ball.speedY); // 向上反弹
                    newY = avoidY - GREEN_BALL_SIZE; // 确保小球在避开区域外
                }
            }
            
            // 躲避逻辑：简单安全的实现 + 调试日志
            if (currentLevel > 1 && yellowBall && predictionDistance > 0) {
                const greenBallCenterX = newX + GREEN_BALL_SIZE / 2;
                const greenBallCenterY = newY + GREEN_BALL_SIZE / 2;
                const yellowBallCenterX = yellowBallX + yellowBallSize / 2;
                const yellowBallCenterY = yellowBallY + yellowBallSize / 2;
                
                const dx = greenBallCenterX - yellowBallCenterX;
                const dy = greenBallCenterY - yellowBallCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < predictionDistance && distance > 0) {
                    const escapeX = dx / distance;
                    const escapeY = dy / distance;
                    const escapeStrength = (predictionDistance - distance) / predictionDistance;
                    
                    const oldNewX = newX;
                    const oldNewY = newY;
                    newX += escapeX * escapeStrength * 3;
                    newY += escapeY * escapeStrength * 3;
                    
                    newX = Math.max(0, Math.min(frameRect.width - GREEN_BALL_SIZE, newX));
                    newY = Math.max(0, Math.min(frameRect.height - GREEN_BALL_SIZE, newY));
                }
            }

            // 更新位置
            ball.x = newX;
            ball.y = newY;
            ball.element.style.left = `${newX}px`;
            ball.element.style.top = `${newY}px`;
            
            // 检测与小黄球的碰撞
            if (yellowBall) {
                
                // 计算两球中心距离
                const dx = (ball.x + GREEN_BALL_SIZE / 2) - (yellowBallX + yellowBallSize / 2);
                const dy = (ball.y + GREEN_BALL_SIZE / 2) - (yellowBallY + yellowBallSize / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 碰撞检测
                if (distance < (GREEN_BALL_SIZE + yellowBallSize) / 2) {
                    // 黄色小球速度为0时，不得分，不算入成功率
                    if (Math.round(dashboardValue) === 0) {
                        // 移除小绿球
                        frame.removeChild(ball.element);
                        greenBalls.splice(i, 1);
                        console.log('黄色小球速度为0，不得分');
                        consecutiveEats = 0; // 重置连续计数
                        continue;
                    }
                    
                    const speedDiff = Math.abs(Math.round(dashboardValue) - ball.speed);
                    let points = 0;
                    let isPerfect = false;
                    
                    if (speedDiff === 0) {
                        points = 10; // 相同速度，得10分
                        isPerfect = true; // Perfect判定
                        perfectCount++; // Perfect计数+1
                    } else if (speedDiff < 10) {
                        points = 10 - speedDiff; // 速度差1-9，得9-1分
                    }
                    
                    // 连续吃球计数
                    if (points > 0) {
                        consecutiveEats++;
                    } else {
                        consecutiveEats = 0; // 不得分时重置连续计数
                    }
                    
                    // 更新得分
                    roundScore += points;
                    totalEatenBalls++;
                    if (points > 0) {
                        validEatenBalls++;
                    }
                    
                    // 获取黄球位置用于显示效果
                    const effectX = yellowBallX + yellowBallSize / 2;
                    const effectY = yellowBallY;
                    
                    // 显示Perfect效果
                    if (isPerfect) {
                        showPerfectEffect(effectX, effectY);
                        updatePerfectDisplay();
                    }
                    
                    // 显示Great效果（连续吃球3次以上）
                    if (consecutiveEats >= 3) {
                        showGreatEffect(effectX, effectY, consecutiveEats);
                    }
                    
                    // 触发手机震动
                    if (navigator.vibrate) {
                        navigator.vibrate(100); // 震动100毫秒
                    }
                    
                    // 移除小绿球
                    frame.removeChild(ball.element);
                    greenBalls.splice(i, 1);
                    console.log('碰撞小绿球，得分:', points, '速度差:', speedDiff, 'Perfect:', isPerfect, '连续:', consecutiveEats);
                    
                    // 更新得分显示
                    updateScoreDisplay();
                    
                    // 检查是否达标
                    checkRoundEnd();
                }
            }
        }
        
        requestAnimationFrame(updateGreenBalls);
    }
    
    // 定时生成小绿球
    function startGreenBallGeneration() {
        setInterval(() => {
            createGreenBall();
        }, 3000); // 每3秒生成一个
    }
    
    // 初始化球的位置和启动移动
    initBallPosition();
    updateBallMovement();
    updateGreenBalls();
    startGreenBallGeneration();
    
    // 初始化游戏系统（等级挑战系统）
    initGameSystem();
    
    // 为按钮添加触摸事件监听
    addTouchEventListeners();
    
    // 启动游戏，重置回合并开始计时器
    resetRound();
    
    // 输出计时器大小的日志
    setTimeout(() => {
        const timerValue = document.getElementById('timer-value');
        if (timerValue) {
            const rect = timerValue.getBoundingClientRect();
            console.log('计时器大小:', rect.width, 'x', rect.height);
            console.log('计时器样式:', getComputedStyle(timerValue).fontSize);
        }
    }, 1000);

}

// ============================================
// 游戏系统 - 等级挑战系统
// ============================================

// 等级配置系统
const LEVEL_CONFIGS = [
    { level: 1, slowMin: 1, slowMax: 10, slowProb: 0.6, midMin: 11, midMax: 18, midProb: 0.3, fastMin: 19, fastMax: 22, fastProb: 0.1, targetScore: 50, targetSuccessRate: 0.6 },
    { level: 2, slowMin: 1, slowMax: 9, slowProb: 0.55, midMin: 10, midMax: 19, midProb: 0.32, fastMin: 20, fastMax: 24, fastProb: 0.13, targetScore: 120, targetSuccessRate: 0.65 },
    { level: 3, slowMin: 1, slowMax: 8, slowProb: 0.5, midMin: 9, midMax: 20, midProb: 0.34, fastMin: 21, fastMax: 26, fastProb: 0.16, targetScore: 200, targetSuccessRate: 0.7 },
    { level: 4, slowMin: 1, slowMax: 7, slowProb: 0.45, midMin: 8, midMax: 21, midProb: 0.36, fastMin: 22, fastMax: 28, fastProb: 0.19, targetScore: 300, targetSuccessRate: 0.7 },
    { level: 5, slowMin: 1, slowMax: 6, slowProb: 0.4, midMin: 7, midMax: 22, midProb: 0.38, fastMin: 23, fastMax: 30, fastProb: 0.22, targetScore: 420, targetSuccessRate: 0.75 },
    { level: 6, slowMin: 1, slowMax: 5, slowProb: 0.35, midMin: 6, midMax: 24, midProb: 0.4, fastMin: 25, fastMax: 33, fastProb: 0.25, targetScore: 560, targetSuccessRate: 0.75 },
    { level: 7, slowMin: 1, slowMax: 4, slowProb: 0.3, midMin: 5, midMax: 26, midProb: 0.42, fastMin: 27, fastMax: 36, fastProb: 0.28, targetScore: 720, targetSuccessRate: 0.8 },
    { level: 8, slowMin: 1, slowMax: 3, slowProb: 0.25, midMin: 4, midMax: 28, midProb: 0.44, fastMin: 29, fastMax: 40, fastProb: 0.31, targetScore: 900, targetSuccessRate: 0.8 },
    { level: 9, slowMin: 1, slowMax: 2, slowProb: 0.2, midMin: 3, midMax: 32, midProb: 0.46, fastMin: 33, fastMax: 45, fastProb: 0.34, targetScore: 1100, targetSuccessRate: 0.85 },
    { level: 10, slowMin: 1, slowMax: 1, slowProb: 0.15, midMin: 2, midMax: 40, midProb: 0.48, fastMin: 41, fastMax: 55, fastProb: 0.37, targetScore: 999999, targetSuccessRate: 1 }
];

// 游戏状态
let currentLevel = 1; // 当前等级
let unlockedLevel = 1; // 已解锁的最高等级
let roundScore = 0; // 本局得分
let totalEatenBalls = 0; // 本局吃到的球数
let validEatenBalls = 0; // 本局有效得分的球数
let perfectCount = 0; // Perfect次数
let consecutiveEats = 0; // 连续吃球计数
let ballsInRound = 0; // 本局已生成的球数
let greenBalls = []; // 存储小绿球信息
let roundStartTime = 0; // 本局开始时间
const ROUND_TIME_LIMIT = 3 * 60 * 1000; // 3分钟时间限制（毫秒）
let timerInterval = null; // 计时器间隔ID
let timerStarted = false; // 计时器是否已经开始
let timerPaused = true; // 计时器是否暂停

// 保存游戏数据
function saveGameData() {
    const data = {
        unlockedLevel: unlockedLevel,
        currentLevel: currentLevel
    };
    localStorage.setItem('ballChaseGame', JSON.stringify(data));
    console.log('游戏数据已保存:', data);
}

// 加载游戏数据
function loadGameData() {
    const saved = localStorage.getItem('ballChaseGame');
    if (saved) {
        const data = JSON.parse(saved);
        unlockedLevel = data.unlockedLevel || 1;
        currentLevel = Math.min(data.currentLevel || 1, unlockedLevel);
        console.log('游戏数据已加载:', data);
        return true;
    }
    return false;
}

// 获取当前等级配置
function getCurrentLevelConfig() {
    return LEVEL_CONFIGS.find(c => c.level === currentLevel) || LEVEL_CONFIGS[0];
}

// 更新得分显示
function updateScoreDisplay() {
    const config = getCurrentLevelConfig();
    
    // 更新等级显示
    const levelValue = document.getElementById('level-value');
    if (levelValue) {
        levelValue.textContent = currentLevel;
    }
    
    // 更新得分显示
    const scoreValue = document.getElementById('score-value');
    if (scoreValue) {
        scoreValue.textContent = roundScore;
        scoreValue.classList.remove('not-met');
        if (roundScore < config.targetScore) {
            scoreValue.classList.add('not-met');
        }
    }
    
    // 更新成功率显示
    const successRateValue = document.getElementById('success-rate-value');
    if (successRateValue) {
        const rate = totalEatenBalls > 0 ? (validEatenBalls / totalEatenBalls * 100).toFixed(0) : 0;
        successRateValue.textContent = `${rate}%`;
        successRateValue.classList.remove('not-met');
        const currentRate = totalEatenBalls > 0 ? validEatenBalls / totalEatenBalls : 1;
        if (currentRate < config.targetSuccessRate) {
            successRateValue.classList.add('not-met');
        }
    }
}

// 更新Perfect显示
function updatePerfectDisplay() {
    const perfectValue = document.getElementById('perfect-value');
    if (perfectValue) {
        perfectValue.textContent = perfectCount;
    }
}

// 显示Perfect效果
function showPerfectEffect(x, y) {
    const container = document.getElementById('effect-container');
    if (!container) return;
    
    const effect = document.createElement('div');
    effect.className = 'perfect-effect';
    effect.textContent = 'Perfect +1';
    effect.style.left = `${x}px`;
    effect.style.top = `${y - 40}px`;
    
    container.appendChild(effect);
    
    // 1秒后移除
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 1000);
}

// 显示Great效果
function showGreatEffect(x, y, count) {
    const container = document.getElementById('effect-container');
    if (!container) return;
    
    const effect = document.createElement('div');
    effect.className = 'great-effect';
    effect.textContent = `Great x${count}`;
    effect.style.left = `${x}px`;
    effect.style.top = `${y - 80}px`;
    
    container.appendChild(effect);
    
    // 1.5秒后移除
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 1500);
}

// 重置本局
function resetRound() {
    roundScore = 0;
    totalEatenBalls = 0;
    validEatenBalls = 0;
    perfectCount = 0;
    consecutiveEats = 0;
    ballsInRound = 0;
    roundStartTime = Date.now(); // 记录本局开始时间
    
    // 重置计时器状态
    timerStarted = false;
    timerPaused = true;
    
    // 清除计时器
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 清除所有小绿球
    const frame = document.getElementById('dynamic-frame');
    if (frame) {
        greenBalls.forEach(ball => {
            if (ball.element && ball.element.parentNode) {
                ball.element.parentNode.removeChild(ball.element);
            }
        });
        greenBalls.length = 0;
    }
    
    updateScoreDisplay();
    
    // 启动计时器（显示3:00但暂停）
    startTimer();
    
    console.log('本局已重置');
}

// 启动计时器
function startTimer() {
    // 清除之前的计时器
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // 立即更新一次计时器（显示3:00）
    updateTimer();
    
    // 设置新的计时器，每秒更新一次
    timerInterval = setInterval(updateTimer, 1000);
}

// 更新计时器显示
function updateTimer() {
    const currentTime = Date.now();
    let remainingTime;
    
    if (timerPaused) {
        // 计时器暂停，显示3:00
        remainingTime = ROUND_TIME_LIMIT;
    } else {
        // 计时器运行中，计算剩余时间
        const elapsedTime = currentTime - roundStartTime;
        remainingTime = Math.max(0, ROUND_TIME_LIMIT - elapsedTime);
    }
    
    // 计算分和秒
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    
    // 格式化时间显示
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // 更新显示
    const timerValue = document.getElementById('timer-value');
    if (timerValue) {
        timerValue.textContent = timeString;
    }
    
    // 检查是否时间到
    if (!timerPaused && remainingTime <= 0) {
        clearInterval(timerInterval);
        
        // 检查是否达标
        const leveledUp = checkLevelUp();
        if (!leveledUp) {
            showChallengeFailModal();
        }
    }
}

// 检查是否升级
function checkLevelUp() {
    const config = getCurrentLevelConfig();
    const successRate = totalEatenBalls > 0 ? validEatenBalls / totalEatenBalls : 0;
    
    if (roundScore >= config.targetScore && successRate >= config.targetSuccessRate) {
        if (currentLevel < 10) {
            currentLevel++;
            if (currentLevel > unlockedLevel) {
                unlockedLevel = currentLevel;
            }
            saveGameData();
            showLevelUpModal();
        }
        return true;
    }
    return false;
}

// 检查本局是否结束（达标或时间到）
function checkRoundEnd() {
    // 实时检查是否达标
    const leveledUp = checkLevelUp();
    if (leveledUp) {
        // 清除计时器
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        showLevelUpModal();
        return true;
    }
    
    return false;
}

// 显示升级提示
function showLevelUpModal() {
    const modal = document.getElementById('level-up-modal');
    const message = document.getElementById('level-up-message');
    if (modal && message) {
        message.textContent = `恭喜解锁第 ${currentLevel} 级！`;
        modal.style.display = 'block';
    }
}

// 显示挑战失败提示
function showChallengeFailModal() {
    const modal = document.getElementById('challenge-fail-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// 隐藏模态框
function hideModals() {
    const levelUpModal = document.getElementById('level-up-modal');
    const challengeFailModal = document.getElementById('challenge-fail-modal');
    if (levelUpModal) levelUpModal.style.display = 'none';
    if (challengeFailModal) challengeFailModal.style.display = 'none';
    
    // 清除计时器
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    resetRound();
    console.log('模态框已隐藏，游戏已重置');
}

// 为按钮添加触摸事件监听
function addTouchEventListeners() {
    const levelUpBtn = document.querySelector('#level-up-modal button');
    const challengeFailBtn = document.querySelector('#challenge-fail-modal button');
    
    if (levelUpBtn) {
        levelUpBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            hideModals();
        });
    }
    
    if (challengeFailBtn) {
        challengeFailBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            hideModals();
        });
    }
}

// 根据等级获取小绿球速度配置
function getLevelBasedSpeedConfig() {
    const config = getCurrentLevelConfig();
    const random = Math.random();
    
    if (random < config.slowProb) {
        return { min: config.slowMin, max: config.slowMax };
    } else if (random < config.slowProb + config.midProb) {
        return { min: config.midMin, max: config.midMax };
    } else {
        return { min: config.fastMin, max: config.fastMax };
    }
}

// 重写createGreenBall函数，使用等级配置
const originalCreateGreenBall = createGreenBall;
function createGreenBall() {
    // completeCount < 4 时不生成小绿球
    if (completeCount < 4) return;
    
    if (greenBalls.length >= MAX_GREEN_BALLS) return;
    
    const speedConfig = getLevelBasedSpeedConfig();
    const speed = Math.floor(Math.random() * (speedConfig.max - speedConfig.min + 1)) + speedConfig.min;
    
    const angle = Math.random() * Math.PI * 2;
    const speedX = Math.cos(angle) * speed;
    const speedY = Math.sin(angle) * speed;
    
    const ball = document.createElement('div');
    ball.className = 'green-ball';
    
    const speedText = document.createElement('span');
    speedText.className = 'speed-text';
    speedText.textContent = speed;
    ball.appendChild(speedText);
    
    const frame = document.getElementById('dynamic-frame');
    const frameRect = frame.getBoundingClientRect();
    
    let ballX, ballY;
    let validPosition = false;
    
    while (!validPosition) {
        ballX = Math.random() * (frameRect.width - GREEN_BALL_SIZE);
        ballY = Math.random() * (frameRect.height - GREEN_BALL_SIZE);
        
        const dashboardLeft = 20;
        const dashboardTop = 40;
        const dashboardSize = 120;
        
        // 检查是否在仪表盘中
        const inDashboard = ballX < dashboardLeft + dashboardSize && ballY < dashboardTop + dashboardSize;
        
        // 检查是否在避开区域内
        const inAvoidArea = isPointInAvoidArea(ballX, ballY);
        
        if (!inDashboard && !inAvoidArea) {
            validPosition = true;
        }
    }
    
    ball.style.left = `${ballX}px`;
    ball.style.top = `${ballY}px`;
    frame.appendChild(ball);
    
    greenBalls.push({
        element: ball,
        x: ballX,
        y: ballY,
        speedX: speedX,
        speedY: speedY,
        speed: speed
    });
    
    console.log('生成小绿球，速度:', speed);
}

// 初始化游戏系统
function initGameSystem() {
    // 加载游戏数据
    loadGameData();
    
    // 设置等级点击事件
    setupLevelClick();
    
    // 更新得分显示
    updateScoreDisplay();
    
    console.log('游戏系统初始化完成，当前等级:', currentLevel);
    
    // 检验不需要的元素是否被清除
    console.log('=== 检验不需要的元素 ===');
    
    // 检验白色虚线的车道
    const lanes = [
        document.getElementById('top-top-lane'),
        document.getElementById('top-lane'),
        document.getElementById('bottom-lane'),
        document.getElementById('bottom-bottom-lane')
    ];
    console.log('车道线元素:', lanes);
}

// 设置等级点击事件
function setupLevelClick() {
    const levelDisplay = document.getElementById('level-display');
    if (!levelDisplay) return;
    
    let longPressTimer = null;
    const longPressDuration = 3000;
    let touchStartTime = 0;
    
    // 触摸事件（移动设备）
    levelDisplay.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        touchStartTime = Date.now();
        longPressTimer = setTimeout(() => {
            console.log('长按等级区域超过3秒，显示等级选择面板');
            showLevelSelectModal();
        }, longPressDuration);
    });
    
    levelDisplay.addEventListener('touchend', (e) => {
        e.stopPropagation();
        const touchDuration = Date.now() - touchStartTime;
        
        if (touchDuration >= longPressDuration) {
            clearTimeout(longPressTimer);
            return;
        }
        
        clearTimeout(longPressTimer);
    });
    
    levelDisplay.addEventListener('touchmove', (e) => {
        e.stopPropagation();
        clearTimeout(longPressTimer);
    });
    
    // 鼠标事件（PC机）
    levelDisplay.addEventListener('mousedown', () => {
        touchStartTime = Date.now();
        longPressTimer = setTimeout(() => {
            console.log('长按等级区域超过3秒，显示等级选择面板');
            showLevelSelectModal();
        }, longPressDuration);
    });
    
    levelDisplay.addEventListener('mouseup', () => {
        const touchDuration = Date.now() - touchStartTime;
        
        if (touchDuration >= longPressDuration) {
            clearTimeout(longPressTimer);
            return;
        }
        
        clearTimeout(longPressTimer);
    });
    
    levelDisplay.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
    });
}

// 显示等级选择面板
function showLevelSelectModal() {
    const modal = document.getElementById('level-select-modal');
    const levelButtons = document.getElementById('level-buttons');
    const closeBtn = document.getElementById('level-select-close-btn');
    
    if (!modal || !levelButtons) {
        console.log('面板元素未找到');
        return;
    }
    
    console.log('当前解锁等级:', unlockedLevel);
    console.log('当前等级:', currentLevel);
    
    levelButtons.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = i;
        btn.type = 'button';
        
        if (i > unlockedLevel) {
            btn.classList.add('locked');
            btn.disabled = true;
            console.log('等级', i, '已锁定，因为', i, '>', unlockedLevel);
        } else {
            const handleLevelClick = (e) => {
                console.log('等级按钮被点击:', i, '事件类型:', e.type);
                console.log('按钮元素:', btn);
                console.log('按钮状态:', { disabled: btn.disabled, className: btn.className });
                e.stopPropagation();
                e.preventDefault();
                console.log('点击等级', i);
                currentLevel = i;
                console.log('更新后当前等级:', currentLevel);
                saveGameData();
                console.log('游戏数据已保存');
                updateScoreDisplay();
                console.log('得分显示已更新');
                resetRound();
                console.log('本局已重置');
                hideLevelSelectModal();
                console.log('等级选择面板已关闭');
            };
            
            btn.addEventListener('click', (e) => {
                console.log('click事件触发:', i);
                handleLevelClick(e);
            });
            btn.addEventListener('touchstart', (e) => {
                console.log('touchstart事件触发:', i);
                handleLevelClick(e);
            });
            console.log('等级', i, '已解锁，添加点击事件');
        }
        
        if (i === currentLevel) {
            btn.classList.add('current');
        }
        
        levelButtons.appendChild(btn);
        console.log('按钮', i, '已添加到DOM');
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            console.log('点击关闭按钮');
            hideLevelSelectModal();
        });
    }
    
    modal.style.display = 'flex';
    console.log('等级选择面板已显示');
}

// 隐藏等级选择面板
function hideLevelSelectModal() {
    const modal = document.getElementById('level-select-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}



// 默认游戏数据（使用用户提供的统计数据）
const DEFAULT_GAME_DATA = {
    completeCount: 4,
    allTouchData: [
        {
            timestamp: 1774767805016,
            top: { x: 109, y: 230, radius: 50, width: 100, height: 100 },
            middle: { x: 184, y: 205, radius: 50, width: 150, height: 100 },
            bottom: { x: 259, y: 169, radius: 50, width: 100, height: 100 }
        },
        {
            timestamp: 1774767811230,
            top: { x: 105, y: 224, radius: 50, width: 100, height: 100 },
            middle: { x: 184, y: 205, radius: 50, width: 150, height: 100 },
            bottom: { x: 250, y: 168, radius: 50, width: 100, height: 100 }
        }
    ],
    touchData: {
        bottom: { x: 256, y: 174, radius: 50, width: 100, height: 100 },
        middle: { x: 184, y: 205, radius: 50, width: 150, height: 100 },
        top: { x: 95, y: 219, radius: 50, width: 100, height: 100 }
    },
    middleRangeAdjusted: false,
    middleRangeStart: 0.1350581728178879,
    middleRangeEnd: 0.6350581728178879
};

// 存储触摸位置数据
const touchData = {
    bottom: { x: 0, y: 0, radius: 50, width: 100, height: 100 },
    middle: { x: 0, y: 0, radius: 50, width: 200, height: 100 },
    top: { x: 0, y: 0, radius: 50, width: 100, height: 100 }
};

// 存储所有记录的数据（初始为空，在 initGame 中设置默认值）
const allTouchData = [];
// 记录上一次"下"的数据，用来检测变化
let lastBottomX = 0;
let lastBottomY = 0;

// 是否已调整过"中"的范围
let middleRangeAdjusted = false;
// 调整后的阈值（默认是0.33-0.66，调整后是0.2-0.8）
let middleRangeStart = 0.33;
let middleRangeEnd = 0.66;
// 长按压3秒的计时器
let longPressTimer = null;
// 长按压开始时间
let longPressStartTime = 0;

// 触摸计时器
let touchTimer = null;
let currentTouch = null;
// 长按计数器，用于记录第几次长按
let touchCount = 0;
// 记录完成次数（上中下都有值）
let completeCount = 0;

// 仪表盘数值相关
let dashboardValue = 0; // 当前仪表盘显示的数值
let targetDashboardValue = 0; // 目标数值
let dashboardAnimationId = null; // 动画requestId
const DASHBOARD_MAX_VALUE = 30; // 仪表盘最大值

// 圆球不需要旋转，移除相关变量

// 设置触摸事件监听器
function setupTouchListeners() {
    const gameContainer = document.querySelector('.game-container');
    const touchInfo = document.querySelector('.touch-info');
    const touchArea = document.querySelector('.touch-area');
    
    // 触摸开始事件
    gameContainer.addEventListener('touchstart', (e) => {
        // 阻止默认的滑动行为，防止页面滚动
        e.preventDefault();
        
        if (e.target.closest('button') || e.target.closest('.dashboard')) {
            return;
        }
        currentTouch = e.touches[0];
        
        // 当 completeCount >= 4 时，处理触摸
        if (completeCount >= 4) {
            const containerHeight = gameContainer.clientHeight;
            const rect = gameContainer.getBoundingClientRect();
            
            // 只有一个手指，保持原有逻辑
            const mirrorX = currentTouch.clientX - rect.left;
            const mirrorY = containerHeight - currentTouch.clientY;
            
            if (isNearDrawArea(mirrorX, mirrorY)) {
                updateTouchInfo(currentTouch, touchArea);
            } else {
                touchArea.style.opacity = '0';
            }
        } else {
            updateTouchInfo(currentTouch, touchArea);
        }
        
        // 开始计时
        if (!stopwatchRunning && completeCount < 4) {
            resetStopwatch();
            stopwatchRunning = true;
            stopwatchInterval = setInterval(() => {
                stopwatchMilliseconds += 10;
                if (stopwatchMilliseconds >= 1000) {
                    stopwatchMilliseconds = 0;
                    stopwatchSeconds += 1;
                }
                
                const totalSeconds = stopwatchSeconds + (stopwatchMilliseconds / 1000);
                // 只有 completeCount <4 时才显示秒数
                if (completeCount < 4) {
                    document.querySelector('.dashboard-value').textContent = totalSeconds.toFixed(2);
                }
            }, 10);
        }
        
        // 开始计时（1秒记录数据）
        if (completeCount < 3) {
            touchTimer = setTimeout(() => {
                // 超过1秒，记录数据
                // currentTouch 已经是 e.touches[0]，直接传递
                recordTouchData(currentTouch);
                // 记录完成后停止计时
                stopStopwatch();
            }, 1000);
        } else if (completeCount === 3) {
            // 当completeCount=3时，3秒后自动停止计时
            longPressTimer = setTimeout(() => {
                stopStopwatch();
            }, 3000);
        }
    });
    
    // 触摸移动事件（添加节流，减少更新频率）
    let lastUpdateTime = 0;
    gameContainer.addEventListener('touchmove', (e) => {
        // 阻止默认的滑动行为，防止页面滚动
        e.preventDefault();
        
        if (e.target.closest('button')) {
            return;
        }
        
        const now = Date.now();
        if (now - lastUpdateTime < 16) {
            return;
        }
        lastUpdateTime = now;
        
        currentTouch = e.touches[0];
        updateTouchInfo(currentTouch, touchArea);
        
        // completeCount达到4后才启用绘制区域逻辑和速度计
        if (completeCount >= 4) {
            const gameContainer = document.querySelector('.game-container');
            const containerHeight = gameContainer.clientHeight;
            const rect = gameContainer.getBoundingClientRect();
            
            // 只有一个手指，保持原有逻辑
            const mirrorX = currentTouch.clientX - rect.left;
            const mirrorY = containerHeight - currentTouch.clientY;
            
            // 只有在绘制范围附近100像素内才更新
            if (isNearDrawArea(mirrorX, mirrorY)) {
                
                
                // 更新仪表盘数值
                targetDashboardValue = calculateDashboardValue(mirrorY);
                if (!dashboardAnimationId) {
                    updateDashboardValue();
                }
            }
        }
    });
    
    // 触摸结束事件
    gameContainer.addEventListener('touchend', (e) => {
        // 阻止默认的滑动行为，防止页面滚动
        e.preventDefault();
        
        touchInfo.textContent = '触摸位置: (0, 0)';
        touchArea.style.opacity = '0';
        
        // 隐藏触摸区域（白色圆圈）
        const touchAreaTop = document.querySelector('.touch-area-top');
        const touchAreaMiddle = document.querySelector('.touch-area-middle');
        const touchAreaBottom = document.querySelector('.touch-area-bottom');
        if (touchAreaTop) touchAreaTop.style.opacity = '0';
        if (touchAreaMiddle) touchAreaMiddle.style.opacity = '0';
        if (touchAreaBottom) touchAreaBottom.style.opacity = '0';
        
        // 停止计时并显示最终时间
        stopStopwatch();
        
        // 清除计时器
        clearTimeout(touchTimer);
        clearTimeout(longPressTimer);
        currentTouch = null;
        
        // 触摸结束时仪表盘数值回落到0
        targetDashboardValue = 0;
        if (!dashboardAnimationId) {
            updateDashboardValue();
        }
    });
    
    // 鼠标点击事件（用于桌面测试）
    gameContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) {
            return;
        }
        currentTouch = e;
        
        // 当 completeCount >= 4 时，只有在绘制范围附近才显示白色圆圈
        if (completeCount >= 4) {
            const containerHeight = gameContainer.clientHeight;
            const rect = gameContainer.getBoundingClientRect();
            const mirrorX = e.clientX - rect.left;
            const mirrorY = containerHeight - e.clientY;
            
            if (isNearDrawArea(mirrorX, mirrorY)) {
                updateTouchInfo(e, touchArea);
            } else {
                // 不在范围内，不显示白色圆圈
                touchArea.style.opacity = '0';
            }
        } else {
            updateTouchInfo(e, touchArea);
        }
        
        // 开始计时
        if (!stopwatchRunning && completeCount < 4) {
            resetStopwatch();
            stopwatchRunning = true;
            stopwatchInterval = setInterval(() => {
                stopwatchMilliseconds += 10;
                if (stopwatchMilliseconds >= 1000) {
                    stopwatchMilliseconds = 0;
                    stopwatchSeconds += 1;
                }
                
                const totalSeconds = stopwatchSeconds + (stopwatchMilliseconds / 1000);
                // 只有 completeCount <4 时才显示秒数
                if (completeCount < 4) {
                    document.querySelector('.dashboard-value').textContent = totalSeconds.toFixed(2);
                }
            }, 10);
        }
        
        // 开始计时（1秒记录数据）
        if (completeCount < 3) {
            touchTimer = setTimeout(() => {
                // 超过1秒，记录数据
                recordTouchData(e);
                // 记录完成后停止计时
                stopStopwatch();
            }, 1000);
        } else if (completeCount === 3) {
            // 当completeCount=3时，3秒后自动停止计时
            longPressTimer = setTimeout(() => {
                stopStopwatch();
            }, 3000);
        }
    });
    
    // 鼠标移动事件（添加节流，减少更新频率）
    let lastMouseMoveTime = 0;
    gameContainer.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMouseMoveTime < 16) {
            return;
        }
        lastMouseMoveTime = now;
        
        currentTouch = e;
        updateTouchInfo(e, touchArea);
        
        // completeCount达到4后才启用绘制区域逻辑
        if (completeCount >= 4) {
            const gameContainer = document.querySelector('.game-container');
            const containerHeight = gameContainer.clientHeight;
            const rect = gameContainer.getBoundingClientRect();
            const mirrorX = e.clientX - rect.left;
            const mirrorY = containerHeight - e.clientY;
            
            // 只有在绘制范围附近100像素内才更新
            if (isNearDrawArea(mirrorX, mirrorY)) {
                // 更新仪表盘数值
                targetDashboardValue = calculateDashboardValue(mirrorY);
                if (!dashboardAnimationId) {
                    updateDashboardValue();
                }
            }
        }
    });
    
    gameContainer.addEventListener('mouseup', () => {
        touchInfo.textContent = '触摸位置: (0, 0)';
        touchArea.style.opacity = '0';
        
        // 停止计时并显示最终时间
        stopStopwatch();
        
        // 清除计时器
        clearTimeout(touchTimer);
        clearTimeout(longPressTimer);
        currentTouch = null;
        
        // 鼠标松开时仪表盘数值回落到0
        targetDashboardValue = 0;
        if (!dashboardAnimationId) {
            updateDashboardValue();
        }
    });
}

// 记录触摸数据
function recordTouchData(touch) {
    // 使用仪表盘旁边的completeCount来控制记录逻辑
    // completeCount < 3 时正常记录上中下
    // completeCount >= 3 时，不再记录，只等待长按压3秒调整"中"的范围
    
    if (completeCount >= 3) {
        console.log('completeCount >= 3，不再记录数据，只等待长按压3秒调整"中"的范围');
        return;
    }
    
    // 获取容器高度用于镜像坐标
    const gameContainer = document.querySelector('.game-container');
    const containerHeight = gameContainer.clientHeight;
    
    // 镜像坐标：以横向中线为基准翻转
    const rect = gameContainer.getBoundingClientRect();
    const mirrorX = Math.round(touch.clientX - rect.left);
    const originalY = Math.round(touch.clientY - rect.top);
    const mirrorY = containerHeight - originalY;
    
    // 增加触摸计数
    touchCount++;
    
    // 检查是否所有数据都已记录
    const allDataRecorded = (touchData.top.x !== 0 || touchData.top.y !== 0) && 
                          (touchData.middle.x !== 0 || touchData.middle.y !== 0) && 
                          (touchData.bottom.x !== 0 || touchData.bottom.y !== 0);
    
    // 根据计数决定记录到哪个位置（交换上、下）
    if (touchCount === 1) {
        // 第一次长按，记录到下位置（黄色）
        // 移除紫色发光效果
        const dashboard = document.querySelector('.dashboard');
        if (dashboard) {
            dashboard.classList.remove('purple-glow', 'blinking');
        }
        
        touchData.bottom.x = mirrorX;
        touchData.bottom.y = mirrorY;
        touchData.bottom.radius = 50;
        touchData.bottom.width = 100;
        touchData.bottom.height = 100;
        console.log('记录触摸数据到下位置:', touchData.bottom);
        // 仪表盘闪烁黄色
        flashDashboardColor('#f1c40f');
        // 更新背景文字
        updateBackgroundText('指节完成，开始录入指腹\nKnuckle completed, start recording the palm');
        // 重新绘制按压区域，显示新的指根位置
        if (pressAreaVisible) {
            drawPressAreas();
        }
    } else if (touchCount === 2) {
        // 第二次长按，记录到中位置（绿色）
        if (touchData.bottom.x !== 0 || touchData.bottom.y !== 0) {
            touchData.middle.x = mirrorX;
            touchData.middle.y = mirrorY;
            touchData.middle.radius = 50;
            touchData.middle.width = 150;
            touchData.middle.height = 100;
            console.log('记录触摸数据到中位置:', touchData.middle);
            // 仪表盘闪烁绿色
            flashDashboardColor('#2ecc71');
            // 更新背景文字
            updateBackgroundText('指腹完成，开始录入指尖\nPalm completed, start recording the fingertip');
            // 重新绘制按压区域，显示新的指节位置
            if (pressAreaVisible) {
                drawPressAreas();
            }
        }
    } else if (touchCount === 3) {
        // 第三次长按，记录到上位置（红色）
        if ((touchData.bottom.x !== 0 || touchData.bottom.y !== 0) && (touchData.middle.x !== 0 || touchData.middle.y !== 0)) {
            touchData.top.x = mirrorX;
            touchData.top.y = mirrorY;
            touchData.top.radius = 50;
            touchData.top.width = 100;
            touchData.top.height = 100;
            console.log('记录触摸数据到上位置:', touchData.top);
            // 仪表盘闪烁红色
            flashDashboardColor('#e74c3c');
            // 更新背景文字
            updateBackgroundText('指尖完成，开始录入指节\nFingertip completed, start recording the knuckle');
            // 重新绘制按压区域，显示新的指尖位置
            if (pressAreaVisible) {
                drawPressAreas();
            }
            
            // 第一次三个数据都记录完，completeCount+1
            completeCount++;
            const completeCounter = document.getElementById('complete-counter');
            completeCounter.textContent = completeCount;
            console.log('第一次录入完成，completeCount:', completeCount);
            
            // 当completeCount变为3时，开始仪表盘闪烁
            if (completeCount === 3) {
                console.log('completeCount 变为3，开始仪表盘闪烁');
                const dashboard = document.querySelector('.dashboard');
                if (dashboard) {
                    dashboard.classList.add('blinking');
                }
                
                // 显示确认全指数据的提示
                updateBackgroundText('本次将确认全指数据，请以最舒服的姿势放在屏幕黑绿红圈所示的拇指区域\nThis time will confirm the full finger data, please place your thumb in the most comfortable position as shown by the black, green and red circles on the screen');
            }
            
            // 当 completeCount === 4 时，显示初始提示文字
            if (completeCount === 4) {
                updatePressAreaHint();
            }
            
            // 存到数组
            saveTouchDataToAll();
            
            // 检查是否达到3次
            if (completeCount >= 3) {
                console.log('========================================');
                console.log('统计完成！completeCount = 3');
                console.log('请长按压3秒调整"中"的范围');
                console.log('========================================');
            }
        }
    } else if (touchCount >= 4) {
        // 第四次及以后的按压
        if (allDataRecorded) {
            // 三个都有数据，清空中和上，记录到下
            
            // 存当前这一组数据
            saveTouchDataToAll();
            
            // 只有第一组录入时才清空中和上数据
            // 第二组及以后录入时，保留第一组的绿圈和红圈
            if (completeCount === 0) {
                // 清空中和上
                touchData.middle.x = 0;
                touchData.middle.y = 0;
                touchData.top.x = 0;
                touchData.top.y = 0;
            }
            
            // 检查是否达到3次，如果是就不再记录
                if (completeCount >= 3) {
                    console.log('========================================');
                    console.log('统计完成！completeCount = 3');
                    console.log('请长按压3秒调整"中"的范围');
                    console.log('========================================');
                    
                    // 不再记录
                    return;
                }
            
            // 记录到下
            touchData.bottom.x = mirrorX;
            touchData.bottom.y = mirrorY;
            touchData.bottom.radius = 50;
            touchData.bottom.width = 100;
            touchData.bottom.height = 100;
            console.log('记录触摸数据到下位置:', touchData.bottom);
            
            // 重新绘制按压区域，显示新的指根位置
            if (pressAreaVisible) {
                drawPressAreas();
            }
            
            // 设置触摸计数为1，表示已经记录了下
            touchCount = 1;
        } else if (touchData.bottom.x !== 0 || touchData.bottom.y !== 0) {
            // 只有下有数据，记录到中
            if (touchData.middle.x === 0 && touchData.middle.y === 0) {
                touchData.middle.x = mirrorX;
                touchData.middle.y = mirrorY;
                touchData.middle.radius = 50;
                touchData.middle.width = 150;
                touchData.middle.height = 100;
                console.log('记录触摸数据到中位置:', touchData.middle);
                // 重新绘制按压区域，显示新的指节位置
                if (pressAreaVisible) {
                    drawPressAreas();
                }
            } else if (touchData.top.x === 0 && touchData.top.y === 0) {
                // 下中有数据，记录到上
                touchData.top.x = mirrorX;
                touchData.top.y = mirrorY;
                touchData.top.radius = 50;
                touchData.top.width = 100;
                touchData.top.height = 100;
                console.log('记录触摸数据到上位置:', touchData.top);
                // 重新绘制按压区域，显示新的指尖位置
                if (pressAreaVisible) {
                    drawPressAreas();
                }
                
                // 三个数据又记录完，completeCount+1
                completeCount++;
                const completeCounter = document.getElementById('complete-counter');
                completeCounter.textContent = completeCount;
                console.log('录入完成，completeCount:', completeCount);
                
                // 存到数组
                saveTouchDataToAll();
            }
        }
    }
    
    updateDataDisplay();
}

// 保存当前触摸数据到allTouchData数组（每次"下"值变化时触发，最多3次）
function saveTouchDataToAll() {
    // 如果completeCount已经达到3，不再保存数据
    if (completeCount >= 3) {
        console.log('completeCount >= 3，不再保存数据');
        return;
    }
    
    const currentBottomX = touchData.bottom.x;
    const currentBottomY = touchData.bottom.y;
    const currentBottomHasValue = (currentBottomX !== 0 || currentBottomY !== 0);
    
    // 只有当"下"有值且和上次不一样时才保存
    if (currentBottomHasValue && (currentBottomX !== lastBottomX || currentBottomY !== lastBottomY)) {
        const record = {
            timestamp: Date.now(),
            top: { ...touchData.top },
            middle: { ...touchData.middle },
            bottom: { ...touchData.bottom }
        };
        
        allTouchData.push(record);
        console.log('========================================');
        console.log('新记录已保存！总记录数:', allTouchData.length);
        console.log('当前记录:', record);
        console.log('所有记录:', allTouchData);
        console.log('========================================');
        
        // 更新统计面板
        updateStatsPanel();
        
        // 检查是否达到3次
            if (allTouchData.length >= 3) {
                console.log('========================================');
                console.log('统计已达到3次！记录区域停止记录');
                console.log('========================================');
            }
    }
    
    // 更新状态
    lastBottomX = currentBottomX;
    lastBottomY = currentBottomY;
}

// 获取统计平均值
function getStatsAverage() {
    const count = allTouchData.length;
    
    if (count === 0) {
        return {
            top: { x: 0, y: 0, radius: 50, width: 100, height: 100 },
            middle: { x: 0, y: 0, radius: 50, width: 150, height: 100 },
            bottom: { x: 0, y: 0, radius: 50, width: 100, height: 100 }
        };
    }
    
    // 计算平均值
    let sumTopX = 0, sumTopY = 0, sumTopR = 0, sumTopW = 0, sumTopH = 0;
    let sumMiddleX = 0, sumMiddleY = 0, sumMiddleR = 0, sumMiddleW = 0, sumMiddleH = 0;
    let sumBottomX = 0, sumBottomY = 0, sumBottomR = 0, sumBottomW = 0, sumBottomH = 0;
    
    allTouchData.forEach(record => {
        sumTopX += record.top.x;
        sumTopY += record.top.y;
        sumTopR += record.top.radius;
        sumTopW += record.top.width || 100;
        sumTopH += record.top.height || 100;
        
        sumMiddleX += record.middle.x;
        sumMiddleY += record.middle.y;
        sumMiddleR += record.middle.radius;
        sumMiddleW += record.middle.width || 200;
        sumMiddleH += record.middle.height || 100;
        
        sumBottomX += record.bottom.x;
        sumBottomY += record.bottom.y;
        sumBottomR += record.bottom.radius;
        sumBottomW += record.bottom.width || 100;
        sumBottomH += record.bottom.height || 100;
    });
    
    return {
        top: {
            x: Math.round(sumTopX / count),
            y: Math.round(sumTopY / count),
            radius: Math.round(sumTopR / count),
            width: Math.round(sumTopW / count),
            height: Math.round(sumTopH / count)
        },
        middle: {
            x: Math.round(sumMiddleX / count),
            y: Math.round(sumMiddleY / count),
            radius: Math.round(sumMiddleR / count),
            width: Math.round(sumMiddleW / count),
            height: Math.round(sumMiddleH / count)
        },
        bottom: {
            x: Math.round(sumBottomX / count),
            y: Math.round(sumBottomY / count),
            radius: Math.round(sumBottomR / count),
            width: Math.round(sumBottomW / count),
            height: Math.round(sumBottomH / count)
        }
    };
}

// 更新统计面板
function updateStatsPanel() {
    const count = allTouchData.length;
    
    // 更新记录次数
    const statCount = document.getElementById('stat-count');
    if (statCount) {
        statCount.textContent = count;
    }
    
    if (count === 0) {
        return;
    }
    
    const stats = getStatsAverage();
    
    // 更新上的平均值
    const statTopX = document.getElementById('stat-top-x');
    const statTopY = document.getElementById('stat-top-y');
    const statTopR = document.getElementById('stat-top-r');
    if (statTopX) statTopX.textContent = stats.top.x;
    if (statTopY) statTopY.textContent = stats.top.y;
    if (statTopR) statTopR.textContent = stats.top.radius;
    
    // 更新中的平均值
    const statMiddleX = document.getElementById('stat-middle-x');
    const statMiddleY = document.getElementById('stat-middle-y');
    const statMiddleR = document.getElementById('stat-middle-r');
    if (statMiddleX) statMiddleX.textContent = stats.middle.x;
    if (statMiddleY) statMiddleY.textContent = stats.middle.y;
    if (statMiddleR) statMiddleR.textContent = stats.middle.radius;
    
    // 更新下的平均值
    const statBottomX = document.getElementById('stat-bottom-x');
    const statBottomY = document.getElementById('stat-bottom-y');
    const statBottomR = document.getElementById('stat-bottom-r');
    if (statBottomX) statBottomX.textContent = stats.bottom.x;
    if (statBottomY) statBottomY.textContent = stats.bottom.y;
    if (statBottomR) statBottomR.textContent = stats.bottom.radius;
}

// 更新数据显示
function updateDataDisplay() {
    if (touchData.top.x !== 0 || touchData.top.y !== 0) {
        document.getElementById('data-top').textContent = `圆心: (${touchData.top.x}, ${touchData.top.y}), 半径: ${touchData.top.radius}, 尺寸: ${touchData.top.width}x${touchData.top.height}`;
    } else {
        document.getElementById('data-top').textContent = '0';
    }
    
    if (touchData.middle.x !== 0 || touchData.middle.y !== 0) {
        document.getElementById('data-middle').textContent = `圆心: (${touchData.middle.x}, ${touchData.middle.y}), 半径: ${touchData.middle.radius}, 尺寸: ${touchData.middle.width}x${touchData.middle.height}`;
    } else {
        document.getElementById('data-middle').textContent = '0';
    }
    
    if (touchData.bottom.x !== 0 || touchData.bottom.y !== 0) {
        document.getElementById('data-bottom').textContent = `圆心: (${touchData.bottom.x}, ${touchData.bottom.y}), 半径: ${touchData.bottom.radius}, 尺寸: ${touchData.bottom.width}x${touchData.bottom.height}`;
    } else {
        document.getElementById('data-bottom').textContent = '0';
    }
}

// 仪表盘闪烁颜色
function flashDashboardColor(color) {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) return;
    
    // 保存原始边框颜色
    const originalBorder = dashboard.style.border;
    const originalBoxShadow = dashboard.style.boxShadow;
    
    // 设置闪烁颜色
    dashboard.style.border = `3px solid ${color}`;
    dashboard.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
    
    // 500ms后恢复
    setTimeout(() => {
        dashboard.style.border = originalBorder || '3px solid #3498db';
        dashboard.style.boxShadow = originalBoxShadow || 'none';
    }, 500);
}

// 更新触摸信息和显示触摸区域
function updateTouchInfo(touch, touchArea) {
    const touchInfo = document.querySelector('.touch-info');
    
    // 直接使用触摸坐标，不做镜像
    const x = Math.round(touch.clientX);
    const y = Math.round(touch.clientY);
    
    // 触摸位置只显示黑条，不要文字
    touchInfo.textContent = '';
    
    // 显示触摸区域（直接使用触摸坐标，不做镜像）
    touchArea.style.left = `${x}px`;
    touchArea.style.top = `${y}px`;
    touchArea.style.opacity = '1';
    
    // 可以在这里添加根据触摸位置执行不同操作的逻辑
}

// 设置按钮点击事件
function setupButtons() {
    console.log('setupButtons 开始执行');
    
    const buttons = document.querySelectorAll('.action-button[data-position]');
    console.log('找到的按钮数量:', buttons.length);
    
    const clearButton = document.getElementById('clear-btn');
    const touchAreaTop = document.querySelector('.touch-area-top');
    const touchAreaMiddle = document.querySelector('.touch-area-middle');
    const touchAreaBottom = document.querySelector('.touch-area-bottom');
    const textTop = document.getElementById('text-top');
    const textMiddle = document.getElementById('text-middle');
    const textBottom = document.getElementById('text-bottom');
    
    buttons.forEach((button, index) => {
        const position = button.dataset.position;
        console.log(`按钮 ${index} position:`, position);
        if (position) {
            button.addEventListener('click', () => {
                alert(`点击了${position}按钮！`);
                console.log(`点击了${position}按钮！`);
                showFixedTouchArea(position, touchAreaTop, touchAreaMiddle, touchAreaBottom);
                updateDisplayText(position, textTop, textMiddle, textBottom);
            });
        }
    });
    
    // 清除按钮点击事件
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            alert('点击了清除按钮！');
            clearTouchAreas(touchAreaTop, touchAreaMiddle, touchAreaBottom);
            clearDisplayText(textTop, textMiddle, textBottom);
        });
    }
    
    console.log('setupButtons 执行完成');
}

// 更新显示文本
function updateDisplayText(position, textTop, textMiddle, textBottom) {
    const data = touchData[position];
    console.log('updateDisplayText 被调用, position:', position, 'data:', data);
    const text = data.x !== 0 || data.y !== 0 ? 
        `圆心: (${data.x}, ${data.y}), 半径: ${data.radius}` : '暂无数据';
    console.log('要显示的文本:', text);
    
    if (position === 'top') {
        textTop.textContent = text;
        console.log('已设置 textTop.textContent:', textTop.textContent);
    } else if (position === 'middle') {
        textMiddle.textContent = text;
        console.log('已设置 textMiddle.textContent:', textMiddle.textContent);
    } else if (position === 'bottom') {
        textBottom.textContent = text;
        console.log('已设置 textBottom.textContent:', textBottom.textContent);
    }
}

// 清除显示文本
function clearDisplayText(textTop, textMiddle, textBottom) {
    if (textTop) textTop.textContent = '';
    if (textMiddle) textMiddle.textContent = '';
    if (textBottom) textBottom.textContent = '';
}

// 显示固定的触摸区域
function showFixedTouchArea(position, touchAreaTop, touchAreaMiddle, touchAreaBottom) {
    const data = touchData[position];
    console.log(`显示${position}位置的触摸区域，数据:`, data);
    
    // 判断是否有数据
    if (data.x === 0 && data.y === 0) {
        console.log(`${position}位置没有数据`);
        return;
    }
    
    let targetArea;
    if (position === 'top') {
        targetArea = touchAreaTop;
    } else if (position === 'middle') {
        targetArea = touchAreaMiddle;
    } else if (position === 'bottom') {
        targetArea = touchAreaBottom;
    }
    
    if (targetArea) {
        targetArea.style.left = `${data.x}px`;
        targetArea.style.top = `${data.y}px`;
        targetArea.style.width = `${data.radius * 2}px`;
        targetArea.style.height = `${data.radius * 2}px`;
        targetArea.style.opacity = '1';
        console.log(`${position}触摸区域设置完成`);
    }
}

// 清除所有触摸区域
function clearTouchAreas(touchAreaTop, touchAreaMiddle, touchAreaBottom) {
    if (touchAreaTop) {
        touchAreaTop.style.opacity = '0';
    }
    if (touchAreaMiddle) {
        touchAreaMiddle.style.opacity = '0';
    }
    if (touchAreaBottom) {
        touchAreaBottom.style.opacity = '0';
    }
    console.log('清除所有触摸区域');
}

// 显示统计平均值的触摸区域
function showStatsTouchArea(position, touchAreaTop, touchAreaMiddle, touchAreaBottom) {
    const stats = getStatsAverage();
    const data = stats[position];
    console.log(`显示${position}位置的统计平均值，数据:`, data);
    
    // 判断是否有数据
    if (data.x === 0 && data.y === 0) {
        console.log(`${position}位置没有统计数据`);
        return;
    }
    
    let targetArea;
    if (position === 'top') {
        targetArea = touchAreaTop;
    } else if (position === 'middle') {
        targetArea = touchAreaMiddle;
    } else if (position === 'bottom') {
        targetArea = touchAreaBottom;
    }
    
    if (targetArea) {
        targetArea.style.left = `${data.x}px`;
        targetArea.style.top = `${data.y}px`;
        targetArea.style.width = `${data.radius * 2}px`;
        targetArea.style.height = `${data.radius * 2}px`;
        targetArea.style.opacity = '1';
        console.log(`${position}统计平均值触摸区域设置完成`);
    }
}

// 更新显示统计平均值文本
function updateStatsDisplayText(position, textTop, textMiddle, textBottom) {
    const stats = getStatsAverage();
    const data = stats[position];
    
    let targetText;
    if (position === 'top') {
        targetText = textTop;
    } else if (position === 'middle') {
        targetText = textMiddle;
    } else if (position === 'bottom') {
        targetText = textBottom;
    }
    
    if (targetText) {
        if (data.x !== 0 || data.y !== 0) {
            targetText.textContent = `圆心: (${data.x}, ${data.y})\n半径: ${data.radius}`;
            console.log(`${position}统计平均值文本设置完成`);
        } else {
            targetText.textContent = '';
        }
    }
}

// 秒表功能
let stopwatchInterval = null;
let stopwatchRunning = false;
let stopwatchSeconds = 0;
let stopwatchMilliseconds = 0;

function startStopwatch() {
    const dashboardValue = document.querySelector('.dashboard-value');
    
    // 初始化显示为0
    dashboardValue.textContent = '0';
}

function resetStopwatch() {
    const dashboardValue = document.querySelector('.dashboard-value');
    stopwatchSeconds = 0;
    stopwatchMilliseconds = 0;
    dashboardValue.textContent = '0';
}

function stopStopwatch() {
    const dashboardValue = document.querySelector('.dashboard-value');
    const dashboard = document.querySelector('.dashboard');
    
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
    stopwatchRunning = false;
    
    // 显示最终时间（秒）- 只有 completeCount <4 时才显示
    const totalSeconds = stopwatchSeconds + (stopwatchMilliseconds / 1000);
    if (completeCount < 4) {
        dashboardValue.textContent = totalSeconds.toFixed(2);
    }
    
    console.log('stopStopwatch 被调用，completeCount:', completeCount, 'totalSeconds:', totalSeconds, 'currentTouch:', currentTouch ? '存在' : '不存在');
    
    // 当completeCount=3且计时达到3秒时，调整"中"的范围
    if (completeCount === 3 && totalSeconds >= 3 && currentTouch) {
        console.log('计时达到3秒，调整"中"的范围');
        
        // 停止仪表盘闪烁
        if (dashboard) {
            dashboard.classList.remove('blinking');
        }
        
        adjustMiddleRange(currentTouch);
        // 将completeCount增加到4，避免再次触发
        completeCount = 4;
        const completeCounter = document.getElementById('complete-counter');
        completeCounter.textContent = completeCount;
        // 绘制按压区域
        drawPressAreas();
        // 保存数据到localStorage
        saveStatsData();
    }
}

// 保存统计数据到localStorage
function saveStatsData() {
    if (completeCount >= 4) {
        const stats = getStatsAverage();
        const savedData = {
            stats: stats,
            allTouchData: allTouchData,
            completeCount: completeCount,
            touchData: touchData,
            middleRangeAdjusted: middleRangeAdjusted,
            middleRangeStart: middleRangeStart,
            middleRangeEnd: middleRangeEnd
        };
        localStorage.setItem('gameStats', JSON.stringify(savedData));
        console.log('统计数据已保存到localStorage，completeCount:', completeCount);
    }
}

// 从localStorage加载统计数据
function loadSavedData() {
    const savedData = localStorage.getItem('gameStats');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            if (parsedData.stats && parsedData.allTouchData) {
                // 加载统计数据 - 使用push方式，避免const赋值错误
                allTouchData.length = 0; // 清空现有数据
                parsedData.allTouchData.forEach(record => {
                    allTouchData.push(record);
                });
                completeCount = parsedData.completeCount || 4;
                
                // 恢复touchData
                if (parsedData.touchData) {
                    touchData.top = parsedData.touchData.top || { x: 0, y: 0, radius: 50, width: 100, height: 100 };
                    touchData.middle = parsedData.touchData.middle || { x: 0, y: 0, radius: 50, width: 150, height: 100 };
                    touchData.bottom = parsedData.touchData.bottom || { x: 0, y: 0, radius: 50, width: 100, height: 100 };
                }
                
                // 恢复"中"范围调整状态
                middleRangeAdjusted = parsedData.middleRangeAdjusted || false;
                middleRangeStart = parsedData.middleRangeStart || 0.33;
                middleRangeEnd = parsedData.middleRangeEnd || 0.66;
                
                // 更新UI
                const completeCounter = document.getElementById('complete-counter');
                completeCounter.textContent = completeCount;
                
                // 更新统计面板
                updateStatsPanel();
                updateDataDisplay();
                
                // 如果 completeCount >= 4，绘制按压区域
                if (completeCount >= 4) {
                    drawPressAreas();
                }
                
                console.log('从localStorage加载了统计数据，completeCount:', completeCount);
                return true; // 返回true表示加载成功
            }
        } catch (error) {
            console.error('加载保存数据失败:', error);
        }
    }
    return false; // 返回false表示没有加载到数据
}

// 清除保存的统计数据
function clearSavedData() {
    localStorage.removeItem('gameStats');
    console.log('已清除保存的统计数据');
}

// 设置仪表盘监听器（双击重置记录，长按3秒恢复初始状态）
function setupDashboardListeners() {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) return;
    
    let lastClickTime = 0;
    const doubleClickDelay = 300; // 双击间隔时间（毫秒）
    let longPressTimer = null;
    const longPressDuration = 3000; // 长按3秒
    let longPressTriggered = false; // 标记长按是否已触发
    
    // 鼠标点击事件（双击重置记录）
    dashboard.addEventListener('click', () => {
        if (longPressTriggered) {
            longPressTriggered = false;
            return;
        }
        
        const now = Date.now();
        if (now - lastClickTime < doubleClickDelay) {
            console.log('双击仪表盘，切换绘制区域显示');
            togglePressAreas();
            lastClickTime = 0;
        } else {
            lastClickTime = now;
        }
    });
    
    // 鼠标按下事件（长按）
    dashboard.addEventListener('mousedown', () => {
        longPressTriggered = false; // 重置标记
        longPressTimer = setTimeout(() => {
            console.log('长按仪表盘超过3秒，恢复初始状态');
            longPressTriggered = true; // 标记长按已触发
            resetAllData();
        }, longPressDuration);
    });
    
    // 鼠标释放事件
    dashboard.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
    });
    
    // 鼠标离开事件
    dashboard.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
    });
    
    // 触摸事件（双击 + 长按）
    let lastTapTime = 0;
    let touchStartTime = 0;
    dashboard.addEventListener('touchstart', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        longPressTriggered = false; // 重置标记
        touchStartTime = Date.now();
        
        // 长按计时器
        longPressTimer = setTimeout(() => {
            console.log('长按仪表盘超过3秒，恢复初始状态');
            longPressTriggered = true; // 标记长按已触发
            resetAllData();
        }, longPressDuration);
    });
    
    dashboard.addEventListener('touchend', (e) => {
        e.stopPropagation();
        const touchDuration = Date.now() - touchStartTime;
        
        // 如果持续时间超过3秒，说明长按已触发，不清除计时器
        if (touchDuration >= longPressDuration) {
            return;
        }
        
        // 否则清除计时器
        clearTimeout(longPressTimer);
        
        const now = Date.now();
        if (now - lastTapTime < doubleClickDelay) {
            console.log('双击仪表盘，切换绘制区域显示');
            togglePressAreas();
            lastTapTime = 0;
        } else {
            lastTapTime = now;
        }
    });
}

// 初始化导出数据功能
setupExportData();

// 重置记录数据（双击仪表盘）
function resetRecordData() {
    const touchAreaTop = document.querySelector('.touch-area-top');
    const touchAreaMiddle = document.querySelector('.touch-area-middle');
    const touchAreaBottom = document.querySelector('.touch-area-bottom');
    const textTop = document.getElementById('text-top');
    const textMiddle = document.getElementById('text-middle');
    const textBottom = document.getElementById('text-bottom');
    
    // 重置所有数据
    touchData.top = { x: 0, y: 0, radius: 50, width: 100, height: 100 };
    touchData.middle = { x: 0, y: 0, radius: 50, width: 150, height: 100 };
    touchData.bottom = { x: 0, y: 0, radius: 50, width: 100, height: 100 };
    touchCount = 0;
    lastBottomX = 0;
    lastBottomY = 0;
    allTouchData.length = 0;
    completeCount = 0;
    
    // 重置"中"范围调整状态
    middleRangeAdjusted = false;
    middleRangeStart = 0.33;
    middleRangeEnd = 0.66;
    
    // 清除保存的统计数据
    clearSavedData();
    
    // 清除显示
    clearTouchAreas(touchAreaTop, touchAreaMiddle, touchAreaBottom);
    clearDisplayText(textTop, textMiddle, textBottom);
    updateDataDisplay();
    updateStatsPanel();
    
    // 更新完成计数器
    const completeCounter = document.getElementById('complete-counter');
    completeCounter.textContent = completeCount;
    
    // 重置仪表盘显示
    dashboardValue = 0;
    targetDashboardValue = 0;
    const dashboardEl = document.querySelector('.dashboard-value');
    if (dashboardEl) {
        dashboardEl.textContent = '0';
    }
    
    console.log('记录数据已重置');
}

// 重置所有数据
// 仪表盘闪烁颜色
function flashDashboardColor(color) {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) return;
    
    // 保存原始边框颜色
    const originalBorder = dashboard.style.border;
    const originalBoxShadow = dashboard.style.boxShadow;
    
    // 设置闪烁颜色
    dashboard.style.border = `3px solid ${color}`;
    dashboard.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
    
    // 500ms后恢复
    setTimeout(() => {
        dashboard.style.border = originalBorder;
        dashboard.style.boxShadow = originalBoxShadow;
    }, 500);
}

// 更新绘制区域显示状态
function updateRecordDrawAreas() {
    const touchAreaTop = document.querySelector('.touch-area-top');
    const touchAreaMiddle = document.querySelector('.touch-area-middle');
    const touchAreaBottom = document.querySelector('.touch-area-bottom');
    
    if (!touchAreaTop || !touchAreaMiddle || !touchAreaBottom) {
        return;
    }
    
    // 恢复绘制区域为基础状态（填实但不发光）
    const baseOpacity = '0.6';
    
    if (touchData.bottom.x !== 0 || touchData.bottom.y !== 0) {
        touchAreaBottom.style.opacity = baseOpacity;
        touchAreaBottom.style.backgroundColor = '#000000';
        touchAreaBottom.style.boxShadow = 'none';
    }
    
    if (touchData.middle.x !== 0 || touchData.middle.y !== 0) {
        touchAreaMiddle.style.opacity = baseOpacity;
        touchAreaMiddle.style.backgroundColor = '#2ecc71';
        touchAreaMiddle.style.boxShadow = 'none';
    }
    
    if (touchData.top.x !== 0 || touchData.top.y !== 0) {
        touchAreaTop.style.opacity = baseOpacity;
        touchAreaTop.style.backgroundColor = '#e74c3c';
        touchAreaTop.style.boxShadow = 'none';
    }
}

// 导出数据功能
function setupExportData() {
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.onclick = function() {
            console.log('点击了导出数据按钮');
            exportTouchData();
        };
    }
}

// 导出触摸数据
function exportTouchData() {
    const exportData = {
        completeCount: completeCount,
        allTouchData: allTouchData,
        touchData: touchData,
        middleRangeAdjusted: middleRangeAdjusted,
        middleRangeStart: middleRangeStart,
        middleRangeEnd: middleRangeEnd
    };
    
    const dataString = JSON.stringify(exportData, null, 2);
    
    // 创建导出弹窗
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 90%;
        max-height: 80%;
        overflow: auto;
        font-family: monospace;
        font-size: 12px;
    `;
    
    const pre = document.createElement('pre');
    pre.textContent = dataString;
    
    const button = document.createElement('button');
    button.textContent = '复制并关闭';
    button.style.cssText = `
        margin-top: 10px;
        padding: 10px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
    
    button.onclick = function() {
        navigator.clipboard.writeText(dataString).then(() => {
            alert('数据已复制到剪贴板！');
            document.body.removeChild(modal);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
    };
    
    content.appendChild(pre);
    content.appendChild(button);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function resetAllData() {
    // 仪表盘紫色发光和闪烁效果
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
        dashboard.classList.add('purple-glow', 'blinking');
    }
    
    // 更新背景文字
    updateBackgroundText('请玩家在拇指舒适区域从指节开始录入到指腹到指尖：开始录入指节，可根据界面黑圈引导录入\nPlease start recording from the knuckle to the palm to the fingertip in the thumb comfort area: Start recording the knuckle, guided by the black circle on the interface');
    
    // 重置所有数据
    touchData.top = { x: 0, y: 0, radius: 50, width: 100, height: 100 };
    touchData.middle = { x: 0, y: 0, radius: 50, width: 150, height: 100 };
    touchData.bottom = { x: 0, y: 0, radius: 50, width: 100, height: 100 };
    touchCount = 0;
    completeCount = 0;
    lastBottomX = 0;
    lastBottomY = 0;
    allTouchData.length = 0; // 清空统计数据
    
    // 重置"中"范围调整状态
    middleRangeAdjusted = false;
    middleRangeStart = 0.33;
    middleRangeEnd = 0.66;
    
    // 重置秒表状态
    stopStopwatch();
    resetStopwatch();
    
    // 清除保存的统计数据
    clearSavedData();
    
    // 清除显示
    const touchAreaTop = document.querySelector('.touch-area-top');
    const touchAreaMiddle = document.querySelector('.touch-area-middle');
    const touchAreaBottom = document.querySelector('.touch-area-bottom');
    const textTop = document.getElementById('text-top');
    const textMiddle = document.getElementById('text-middle');
    const textBottom = document.getElementById('text-bottom');
    
    clearTouchAreas(touchAreaTop, touchAreaMiddle, touchAreaBottom);
    clearDisplayText(textTop, textMiddle, textBottom);
    updateDataDisplay();
    updateStatsPanel();
    
    // 清除按压区域
    clearPressAreas();
    
    // 绘制默认的黑圈，提示用户开始录入
    if (pressAreaVisible) {
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            const containerWidth = gameContainer.clientWidth;
            const containerHeight = gameContainer.clientHeight;
            
            // 使用DEFAULT_GAME_DATA中的默认值
            const bottomArea = {
                x: DEFAULT_GAME_DATA.touchData.bottom.x,
                y: containerHeight - DEFAULT_GAME_DATA.touchData.bottom.y,
                radius: DEFAULT_GAME_DATA.touchData.bottom.radius,
                width: DEFAULT_GAME_DATA.touchData.bottom.width,
                height: DEFAULT_GAME_DATA.touchData.bottom.height
            };
            
            // 只绘制黑圈
            createPressArea(gameContainer, bottomArea, '#000000'); // 黑圈
        }
    }
    
    // 更新完成计数器
    const completeCounter = document.getElementById('complete-counter');
    if (completeCounter) {
        completeCounter.textContent = completeCount;
    }
    
    // 重置秒表
    resetStopwatch();
    
    // 重置仪表盘显示
    dashboardValue = 0;
    targetDashboardValue = 0;
    const dashboardEl = document.querySelector('.dashboard-value');
    if (dashboardEl) {
        dashboardEl.textContent = '0';
    }
    
    console.log('所有数据已重置，可以重新开始记录');
}

// 更新背景文字
function updateBackgroundText(text) {
    const backgroundText = document.getElementById('background-text');
    if (backgroundText) {
        backgroundText.textContent = text;
    }
}

// 初始化控制小球的长按事件（用于显示/隐藏绘制区域）
let pressTimer;
let pressAreaVisible = true;

function initControlBallLongPress() {
    const controlBall = document.getElementById('control-ball');
    if (!controlBall) return;
    
    controlBall.addEventListener('touchstart', (e) => {
        e.preventDefault();
        pressTimer = setTimeout(() => {
            if (dashboardValue === 0) {
                togglePressAreas();
            }
        }, 3000);
    });
    
    controlBall.addEventListener('touchmove', (e) => {
        e.preventDefault();
        clearTimeout(pressTimer);
    });
    
    controlBall.addEventListener('touchend', (e) => {
        e.preventDefault();
        clearTimeout(pressTimer);
    });
}

// 切换绘制区域的显示/隐藏
function togglePressAreas() {
    pressAreaVisible = !pressAreaVisible;
    
    if (pressAreaVisible) {
        drawPressAreas();
        updatePressAreaHint();
    } else {
        clearPressAreas();
        updatePressAreaHint();
    }
}

// 更新绘制区域的提示文字
function updatePressAreaHint() {
    // 在初始状态、未开始录入时或次数=4时显示提示
    if (completeCount === 0 || completeCount === 4) {
        const hintText = pressAreaVisible 
            ? '长按三秒仪表盘准备录入玩家拇指控速区域\nLong press the dashboard for 3 seconds to prepare recording the player\'s thumb speed control area'
            : '长按三秒仪表盘准备录入玩家拇指控速区域\nLong press the dashboard for 3 seconds to prepare recording the player\'s thumb speed control area';
        updateBackgroundText(hintText);
    }
}

// 绘制按压区域
function drawPressAreas() {
    // 如果按压区域不可见，不绘制
    if (!pressAreaVisible) return;
    
    // 清除现有按压区域
    clearPressAreas();
    
    const stats = getStatsAverage();
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) return;
    
    // 获取容器宽度和高度
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    
    // 检查touchData中是否有数据
    const hasBottomData = touchData.bottom.x !== 0 || touchData.bottom.y !== 0;
    const hasMiddleData = touchData.middle.x !== 0 || touchData.middle.y !== 0;
    const hasTopData = touchData.top.x !== 0 || touchData.top.y !== 0;
    
    let bottomArea, middleArea, topArea;
    
    // 优先使用touchData中的数据
    if (hasBottomData || hasMiddleData || hasTopData) {
        console.log('使用touchData中的数据绘制按压区域');
        
        if (hasBottomData) {
            bottomArea = {
                x: touchData.bottom.x,
                y: containerHeight - touchData.bottom.y,
                radius: touchData.bottom.radius,
                width: touchData.bottom.width,
                height: touchData.bottom.height
            };
        }
        
        if (hasMiddleData) {
            middleArea = {
                x: touchData.middle.x,
                y: containerHeight - touchData.middle.y,
                radius: touchData.middle.radius,
                width: touchData.middle.width,
                height: touchData.middle.height
            };
        }
        
        if (hasTopData) {
            topArea = {
                x: touchData.top.x,
                y: containerHeight - touchData.top.y,
                radius: touchData.top.radius,
                width: touchData.top.width,
                height: touchData.top.height
            };
        }
    } else if (stats.top.y !== 0 && stats.bottom.y !== 0 && stats.middle.y !== 0) {
        // 如果有统计数据，使用真实坐标
        console.log('使用统计数据绘制按压区域');
        // 反转镜像坐标（触摸记录时使用了镜像坐标，现在需要反转回来显示）
        bottomArea = {
            x: stats.bottom.x,
            y: containerHeight - stats.bottom.y,
            radius: stats.bottom.radius,
            width: stats.bottom.width,
            height: stats.bottom.height
        };
        
        middleArea = {
            x: stats.middle.x,
            y: containerHeight - stats.middle.y,
            radius: stats.middle.radius,
            width: stats.middle.width,
            height: stats.middle.height
        };
        
        topArea = {
            x: stats.top.x,
            y: containerHeight - stats.top.y,
            radius: stats.top.radius,
            width: stats.top.width,
            height: stats.top.height
        };
    } else {
        // 如果没有统计数据，使用默认位置
        console.log('统计数据不完整，使用默认位置显示绘制区域');
        const horizontalPosition = containerWidth * 0.2;
        
        bottomArea = {
            x: horizontalPosition,
            y: containerHeight * 0.8,
            radius: 50,
            width: 100,
            height: 100
        };
        
        middleArea = {
            x: horizontalPosition,
            y: containerHeight * 0.5,
            radius: 50,
            width: 150,
            height: 100
        };
        
        topArea = {
            x: horizontalPosition,
            y: containerHeight * 0.2,
            radius: 50,
            width: 100,
            height: 100
        };
    }
    
    // 只绘制有数据的区域
    if (bottomArea) {
        createPressArea(gameContainer, bottomArea, '#000000'); // 黑圈
    }
    
    if (middleArea) {
        createPressArea(gameContainer, middleArea, '#2ecc71'); // 绿圈
    }
    
    if (topArea) {
        createPressArea(gameContainer, topArea, '#e74c3c'); // 红圈
    }
    

}

// 创建单个按压区域
function createPressArea(container, position, color, label) {
    const area = document.createElement('div');
    area.className = 'press-area';
    
    // 使用记录的 width 和 height
    const width = position.width || 100;
    const height = position.height || 100;
    
    area.style.cssText = `
        position: absolute;
        width: ${width}px;
        height: ${height}px;
        border: 3px solid ${color};
        border-radius: 50%;
        background-color: transparent;
        transform: translate(-50%, -50%);
        left: ${position.x}px;
        top: ${position.y}px;
        z-index: 20;
        pointer-events: none;
    `;
    
    // 添加标签（如果有）
    if (label) {
        const labelEl = document.createElement('div');
        labelEl.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            color: ${color};
            font-size: 1.2rem;
            font-weight: bold;
            text-shadow: 0 0 5px rgba(0,0,0,0.8);
        `;
        labelEl.textContent = label;
        area.appendChild(labelEl);
    }
    
    container.appendChild(area);
}

// 清除按压区域
function clearPressAreas() {
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) return;
    
    const areas = gameContainer.querySelectorAll('.press-area');
    areas.forEach(area => area.remove());
}



// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', initGame);



