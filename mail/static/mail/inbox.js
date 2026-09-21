document.addEventListener('DOMContentLoaded', function () {

    // Inbox button
    document.querySelector('#inbox').addEventListener('click', function () {
        load_mailbox('inbox');
    });

    // Sent button
    document.querySelector('#sent').addEventListener('click', function () {
        load_mailbox('sent');
    });

    // Archived button
    document.querySelector('#archived').addEventListener('click', function () {
        load_mailbox('archive');
    });

    // Compose button
    document.querySelector('#compose').addEventListener('click', function () {
        compose_email();
    });


    // Send email
    document.querySelector('#compose-form').addEventListener('submit', function (event) {

        event.preventDefault();

        const recipients =
            document.querySelector('#compose-recipients').value.trim();

        const subject =
            document.querySelector('#compose-subject').value;

        const body =
            document.querySelector('#compose-body').value;


        if (recipients === '') {
            alert('Please enter a recipient.');
            return;
        }


        fetch('/emails', {
            method: 'POST',

            body: JSON.stringify({
                recipients: recipients,
                subject: subject,
                body: body
            })
        })
        .then(response => response.json())
        .then(result => {

            if (result.error) {
                alert(result.error);
                return;
            }

            // After sending, open Sent
            load_mailbox('sent');

        })
        .catch(error => {

            console.error(error);
            alert('Something went wrong while sending the email.');

        });

    });


    // Open Inbox by default
    load_mailbox('inbox');

});


function compose_email() {

    // Hide email list
    document.querySelector('#emails-view').style.display = 'none';

    // Show compose form
    document.querySelector('#compose-view').style.display = 'block';


    // Clear fields
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';

}


function set_email_style(div, email) {

    // Read email
    if (email.read) {

        div.style.backgroundColor = 'white';
        div.style.fontWeight = 'normal';

    }

    // Unread email
    else {

        div.style.backgroundColor = '#f0f0f0';
        div.style.fontWeight = 'bold';

    }

}


function load_mailbox(mailbox) {

    // Show email list
    document.querySelector('#emails-view').style.display = 'block';

    // Hide compose
    document.querySelector('#compose-view').style.display = 'none';


    // Mailbox title
    let title;

    if (mailbox === 'archive') {

        title = 'Archived';

    } else {

        title =
            mailbox.charAt(0).toUpperCase() +
            mailbox.slice(1);

    }


    document.querySelector('#emails-view').innerHTML =
        `<h3>${title}</h3>`;


    // Get emails from server
    fetch(`/emails/${mailbox}`)
        .then(response => response.json())
        .then(emails => {


            emails.forEach(email => {

                const div = document.createElement('div');


                div.innerHTML = `
                    <strong>${email.sender}</strong>
                    &nbsp;&nbsp;
                    ${email.subject}

                    <span style="float: right;">
                        ${email.timestamp}
                    </span>
                `;


                // Email row styling
                div.style.padding = '10px';
                div.style.border = '1px solid #ddd';
                div.style.marginBottom = '5px';
                div.style.cursor = 'pointer';


                // Read / Unread styling
                set_email_style(div, email);


                // Open email
                div.addEventListener('click', function () {

                    open_email(email.id);

                });


                document.querySelector('#emails-view').append(div);

            });

        })
        .catch(error => {

            console.error(error);

        });

}


function open_email(email_id) {

    // Get email
    fetch(`/emails/${email_id}`)
        .then(response => response.json())
        .then(email => {


            // Start email view
            let buttons = '';


            /*
             * Archive button:
             * Only show Archive/Unarchive for received emails.
             *
             * If current user is the sender,
             * this is a Sent email, so no Archive button.
             */
            if (email.sender !== get_current_user_email()) {

                buttons += `
                    <button
                        id="archive-button"
                        class="btn btn-sm btn-outline-primary">

                        ${email.archived ? 'Unarchive' : 'Archive'}

                    </button>
                `;

            }


            // Reply button
            if (email.sender !== get_current_user_email()) {

                buttons += `
                    <button
                        id="reply-button"
                        class="btn btn-sm btn-outline-primary">

                        Reply

                    </button>
                `;

            }


            // Back button
            buttons += `
                <button
                    id="back-button"
                    class="btn btn-sm btn-outline-secondary">

                    Back

                </button>
            `;


            // Display email
            document.querySelector('#emails-view').innerHTML = `

                <h3>${email.subject}</h3>

                <hr>

                <p>
                    <strong>From:</strong>
                    ${email.sender}
                </p>

                <p>
                    <strong>To:</strong>
                    ${email.recipients.join(', ')}
                </p>

                <p>
                    <strong>Time:</strong>
                    ${email.timestamp}
                </p>

                <hr>

                <p>
                    ${email.body}
                </p>

                <hr>

                ${buttons}

            `;


            // Mark email as read
            fetch(`/emails/${email_id}`, {

                method: 'PUT',

                body: JSON.stringify({
                    read: true
                })

            });


            /*
             * Archive / Unarchive
             */
            const archiveButton =
                document.querySelector('#archive-button');


            if (archiveButton) {

                archiveButton.addEventListener('click', function () {

                    fetch(`/emails/${email_id}`, {

                        method: 'PUT',

                        body: JSON.stringify({

                            archived: !email.archived

                        })

                    })
                    .then(response => {

                        if (response.ok) {

                            if (email.archived) {

                                // Unarchive
                                load_mailbox('archive');

                            } else {

                                // Archive
                                load_mailbox('inbox');

                            }

                        }

                    });

                });

            }


            /*
             * Reply
             */
            const replyButton =
                document.querySelector('#reply-button');


            if (replyButton) {

                replyButton.addEventListener('click', function () {

                    compose_email();


                    // Recipient
                    document.querySelector(
                        '#compose-recipients'
                    ).value = email.sender;


                    // Subject
                    let subject = email.subject;


                    if (!subject.startsWith('Re:')) {

                        subject = 'Re: ' + subject;

                    }


                    document.querySelector(
                        '#compose-subject'
                    ).value = subject;


                    // Body
                    document.querySelector(
                        '#compose-body'
                    ).value =
                        `\n\nOn ${email.timestamp}, ${email.sender} wrote:\n${email.body}`;

                });

            }


            /*
             * Back button
             */
            document.querySelector('#back-button')
                .addEventListener('click', function () {

                    if (email.archived) {

                        load_mailbox('archive');

                    } else if (
                        email.sender === get_current_user_email()
                    ) {

                        load_mailbox('sent');

                    } else {

                        load_mailbox('inbox');

                    }

                });

        });

}


/*
 * Get current logged-in user's email
 */
function get_current_user_email() {

    const heading =
        document.querySelector('h2');

    if (heading) {

        return heading.innerText.trim();

    }

    return '';

}