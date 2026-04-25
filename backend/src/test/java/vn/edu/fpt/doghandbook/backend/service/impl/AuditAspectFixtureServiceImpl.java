package vn.edu.fpt.doghandbook.backend.service.impl;

class AuditAspectFixtureServiceImpl {

    String createFixture(Integer id) {
        return "created-" + id;
    }

    String updateFixture(Integer id) {
        return "updated-" + id;
    }

    void deleteFixture(Integer id) {
    }

    String createFixtureWithoutId(String name) {
        return name;
    }
}
