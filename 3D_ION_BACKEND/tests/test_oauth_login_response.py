from app.routers.auth import _login_response_for_researcher


def test_login_response_uses_google_email_when_db_email_null():
    researcher = {
        "id": "00000000-0000-0000-0000-000000000001",
        "name": "Mateu",
        "email": None,
        "user_type": "pesquisador",
        "status": "regular",
    }

    response = _login_response_for_researcher(
        researcher,
        fallback_email="mateu@gmail.com",
    )

    assert response.email == "mateu@gmail.com"
    assert response.name == "Mateu"
    assert response.access_token
