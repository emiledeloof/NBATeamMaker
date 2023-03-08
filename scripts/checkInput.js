function username(){
    let usernameValue = document.getElementById("username")
    if(usernameValue.value.trim() == ""){
        username.classList.add("outFocus")
    }
}