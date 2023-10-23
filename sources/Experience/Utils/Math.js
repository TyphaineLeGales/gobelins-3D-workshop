const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getRandomFloat = (min, max) => (Math.random() * (max - min) + min);

export   { getRandomInt, getRandomFloat }