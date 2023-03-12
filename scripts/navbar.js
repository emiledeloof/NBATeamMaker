document.getElementById("showProfile").addEventListener("click", () => {
    let ul = document.getElementById("profileUl")
    if(ul.classList.contains("hide")){
        ul.classList.remove("hide")
        ul.classList.add("show")
    } else{
        ul.classList.add("hide")
        ul.classList.remove("show")
    }
})