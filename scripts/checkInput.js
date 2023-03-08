function checkElement(inputId, labelId){
    let input = document.getElementById(inputId)
    input.classList.remove("outFocus")
    let label = document.getElementById(labelId)
    if(input.value.trim() == ""){
        input.classList.add("outFocus")
    } else{
        label.style.top = "2px"
        label.style.fontSize = "12px"
    }
}