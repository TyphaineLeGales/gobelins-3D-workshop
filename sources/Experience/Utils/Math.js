const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomFloat = (min, max) => (Math.random() * (max - min) + min);

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const mapRange = (value, low1, high1, low2, high2)=> low2 + (high2 - low2) * (value - low1) / (high1 - low1);

export   { getRandomInt, getRandomFloat, clamp, mapRange }