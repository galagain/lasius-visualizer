var sliderInput = document.querySelector('#sliderInput');
var sliderValue = document.querySelector('#sliderValue');
var myUnits = 'myUnits';
var off = sliderInput.offsetWidth / (parseInt(sliderInput.max) - parseInt(sliderInput.min));
var px =  ((sliderInput.valueAsNumber - parseInt(sliderInput.min)) * off) - (sliderValue.offsetParent.offsetWidth / 2);

sliderValue.parentElement.style.left = px + 'px';
sliderValue.parentElement.style.top = sliderInput.offsetHeight + 'px';
sliderValue.innerHTML = sliderInput.value + ' ' + myUnits;

sliderInput.oninput =function(){
    let px = ((sliderInput.valueAsNumber - parseInt(sliderInput.min)) * off) - (sliderValue.offsetWidth / 2);
    sliderValue.innerHTML = sliderInput.value + ' ' + myUnits;
    sliderValue.parentElement.style.left = px + 'px';
};